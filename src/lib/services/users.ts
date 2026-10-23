import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { normalizeEmail, normalizeName } from "@/lib/auth/normalize";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { AppError } from "@/lib/errors";

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);
  return user ?? null;
}

export async function findUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function listTeamMembers() {
  return db.select().from(users).orderBy(users.createdAt);
}

export async function countActiveAdmins() {
  const [row] = await db
    .select({ count: count() })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.status, "active")));
  return Number(row?.count ?? 0);
}

export async function updateUserName(userId: string, name: string) {
  const [updated] = await db
    .update(users)
    .set({ name: normalizeName(name), updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  if (!updated) throw new AppError("User not found", "NOT_FOUND");
  return updated;
}

export async function updateUserLocale(userId: string, locale: "en" | "el") {
  const [updated] = await db
    .update(users)
    .set({ locale, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  if (!updated) throw new AppError("User not found", "NOT_FOUND");
  return updated;
}

export async function changePassword(user: User, currentPassword: string, newPassword: string) {
  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) throw new AppError("Your current password is incorrect", "INVALID_PASSWORD");

  const [updated] = await db
    .update(users)
    .set({
      passwordHash: await hashPassword(newPassword),
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  return updated;
}

export async function changeUserRole(actorId: string, targetId: string, role: "admin" | "member") {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(918273646)`);
    const [target] = await tx.select().from(users).where(eq(users.id, targetId)).limit(1);
    if (!target) throw new AppError("User not found", "NOT_FOUND");

    if (target.role === "admin" && role === "member" && target.status === "active") {
      const [row] = await tx
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.status, "active")));
      if (Number(row?.count ?? 0) <= 1) {
        throw new AppError("You cannot demote the last active administrator.", "LAST_ADMIN");
      }
    }

    const [updated] = await tx
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, targetId))
      .returning();
    return updated;
  });
}

export async function setUserStatus(
  actorId: string,
  targetId: string,
  status: "active" | "inactive",
) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(918273647)`);
    const [target] = await tx.select().from(users).where(eq(users.id, targetId)).limit(1);
    if (!target) throw new AppError("User not found", "NOT_FOUND");

    if (status === "inactive" && target.role === "admin" && target.status === "active") {
      const [row] = await tx
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.role, "admin"), eq(users.status, "active")));
      if (Number(row?.count ?? 0) <= 1) {
        throw new AppError("You cannot deactivate the last active administrator.", "LAST_ADMIN");
      }
    }

    if (target.id === actorId && status === "inactive") {
      throw new AppError("You cannot deactivate your own account.", "SELF_DEACTIVATE");
    }

    const [updated] = await tx
      .update(users)
      .set({
        status,
        sessionVersion: sql`${users.sessionVersion} + ${status === "inactive" ? 1 : 0}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetId))
      .returning();
    return updated;
  });
}
