import { createHash } from "node:crypto";

export const PUBLIC_RATE_LIMIT = 60;
export const PUBLIC_RATE_LIMIT_WINDOW_MS = 60_000;
export const PUBLIC_RATE_LIMIT_MAX_ENTRIES = 1_000;

export type PublicRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Epoch milliseconds at which the current window ends. */
  resetAt: number;
  /** Whole seconds until the client may retry; 0 when the request is allowed. */
  retryAfterSeconds: number;
};

export type PublicRateLimiter = {
  check(key: string): PublicRateLimitResult;
};

export type PublicRateLimiterOptions = {
  limit?: number;
  windowMs?: number;
  /** Maximum number of tracked clients before expired/oldest buckets are pruned. */
  maxEntries?: number;
  now?: () => number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

/**
 * Small in-memory fixed-window limiter for the public read path.
 *
 * It is intentionally per-process and best-effort: a reverse proxy or edge
 * limiter should enforce the real quota in multi-instance deployments. The
 * exported factory keeps the limiter deterministic and injectable in tests.
 */
export function createPublicRateLimiter({
  limit = PUBLIC_RATE_LIMIT,
  windowMs = PUBLIC_RATE_LIMIT_WINDOW_MS,
  maxEntries = PUBLIC_RATE_LIMIT_MAX_ENTRIES,
  now = () => Date.now(),
}: PublicRateLimiterOptions = {}): PublicRateLimiter {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Public rate limit must be a positive integer");
  }
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error("Public rate limit window must be a positive number");
  }
  if (!Number.isInteger(maxEntries) || maxEntries < 1) {
    throw new Error("Public rate limit maxEntries must be a positive integer");
  }

  const buckets = new Map<string, Bucket>();

  function prune(currentTime: number) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= currentTime) buckets.delete(key);
    }
    while (buckets.size >= maxEntries) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey === undefined) break;
      buckets.delete(oldestKey);
    }
  }

  return {
    check(key: string): PublicRateLimitResult {
      const currentTime = now();
      const bucket = buckets.get(key);

      if (!bucket || bucket.resetAt <= currentTime) {
        if (buckets.size >= maxEntries) prune(currentTime);
        const resetAt = currentTime + windowMs;
        buckets.set(key, { count: 1, resetAt });
        return {
          allowed: true,
          limit,
          remaining: limit - 1,
          resetAt,
          retryAfterSeconds: 0,
        };
      }

      if (bucket.count >= limit) {
        return {
          allowed: false,
          limit,
          remaining: 0,
          resetAt: bucket.resetAt,
          retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000)),
        };
      }

      bucket.count += 1;
      return {
        allowed: true,
        limit,
        remaining: limit - bucket.count,
        resetAt: bucket.resetAt,
        retryAfterSeconds: 0,
      };
    },
  };
}

/**
 * Derives a per-client key from proxy headers. Prefer the first
 * `X-Forwarded-For` hop, then `X-Real-IP`, and fall back to a shared key when
 * no client address is available (for example direct local development).
 */
function hashClientKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

/**
 * Derives a bounded, non-reversible per-client key from proxy headers.
 *
 * The deployment must have its reverse proxy overwrite `X-Forwarded-For` (or
 * otherwise strip client-supplied values); a proxy that appends leaves a
 * spoofable first hop. The hash keeps attacker-controlled header data out of
 * the in-memory bucket keys and caps memory per entry.
 */
export function clientIdentifierFromHeaders(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return hashClientKey(`xff:${first.slice(0, 256)}`);
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return hashClientKey(`xri:${realIp.slice(0, 256)}`);

  return "unknown";
}

let activeLimiter: PublicRateLimiter = createPublicRateLimiter();

export function checkPublicRateLimit(key: string): PublicRateLimitResult {
  return activeLimiter.check(key);
}

/**
 * Replaces the process-wide limiter. The route uses this seam in tests and
 * operations can use it to tune the threshold without touching the route.
 */
export function setPublicRateLimiter(limiter: PublicRateLimiter) {
  activeLimiter = limiter;
}

export function resetPublicRateLimiter() {
  activeLimiter = createPublicRateLimiter();
}
