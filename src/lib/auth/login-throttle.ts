import { eq } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";
import { normalizeEmail } from "@/lib/auth/normalize";

const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

export async function isLoginLocked(email: string, now = new Date()) {
  const normalized = normalizeEmail(email);
  const [row] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.email, normalized))
    .limit(1);

  if (!row) return false;
  if (row.lockedUntil && row.lockedUntil.getTime() > now.getTime()) return true;
  if (row.lockedUntil && row.lockedUntil.getTime() <= now.getTime()) {
    await db.delete(loginAttempts).where(eq(loginAttempts.email, normalized));
    return false;
  }
  if (row.windowStartedAt.getTime() + WINDOW_MS <= now.getTime()) {
    await db.delete(loginAttempts).where(eq(loginAttempts.email, normalized));
    return false;
  }
  return false;
}

export async function recordFailedLogin(email: string, now = new Date()) {
  const normalized = normalizeEmail(email);
  const [row] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.email, normalized))
    .limit(1);

  if (!row || row.windowStartedAt.getTime() + WINDOW_MS <= now.getTime()) {
    await db
      .insert(loginAttempts)
      .values({
        email: normalized,
        failedCount: 1,
        windowStartedAt: now,
        lockedUntil: null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: loginAttempts.email,
        set: {
          failedCount: 1,
          windowStartedAt: now,
          lockedUntil: null,
          updatedAt: now,
        },
      });
    return;
  }

  const failedCount = row.failedCount + 1;
  await db
    .update(loginAttempts)
    .set({
      failedCount,
      lockedUntil: failedCount >= MAX_FAILURES ? new Date(now.getTime() + LOCK_MS) : row.lockedUntil,
      updatedAt: now,
    })
    .where(eq(loginAttempts.email, normalized));
}

export async function clearLoginAttempts(email: string) {
  await db.delete(loginAttempts).where(eq(loginAttempts.email, normalizeEmail(email)));
}
