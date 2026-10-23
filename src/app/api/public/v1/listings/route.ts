import { NextRequest, NextResponse } from "next/server";
import { checkPublicRateLimit, clientIdentifierFromHeaders } from "@/lib/public-rate-limit";
import { listPublicListings } from "@/lib/services/public-listings";
import { parsePublicListingsQuery } from "@/lib/validation/public-listings";

export const runtime = "nodejs";

const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function errorResponse(
  code: string,
  message: string,
  status: number,
  extraHeaders: Record<string, string> = {},
) {
  return NextResponse.json(
    { error: { code, message } },
    {
      status,
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "no-store",
        ...extraHeaders,
      },
    },
  );
}

export async function GET(request: NextRequest) {
  const rateLimit = checkPublicRateLimit(clientIdentifierFromHeaders(request.headers));
  if (!rateLimit.allowed) {
    return errorResponse("RATE_LIMITED", "Rate limit exceeded. Retry later.", 429, {
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  const parsed = parsePublicListingsQuery(request.nextUrl.searchParams);
  if (!parsed.success) {
    return errorResponse("INVALID_PARAMETER", parsed.message, 400);
  }

  try {
    const page = await listPublicListings(parsed.data);
    return NextResponse.json(page, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch {
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred.", 500);
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      "Access-Control-Max-Age": "86400",
    },
  });
}
