import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { invites, passwordResetTokens, users, type User } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { normalizeEmail, normalizeName } from "@/lib/auth/normalize";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { AppError } from "@/lib/errors";
import { findUserByEmail } from "@/lib/services/users";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 24 * 60 * 60 * 1000;

export async function createInvite(input: {
  email: string;
  role: "admin" | "member";
  invitedById: string;
}) {
  const email = normalizeEmail(input.email);
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AppError("That person already has an account.", "EXISTING_USER");
  }

  await db
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(invites.email, email),
        isNull(invites.acceptedAt),
        isNull(invites.revokedAt),
      ),
    );

  const token = generateToken();
  const [invite] = await db
    .insert(invites)
    .values({
      email,
      role: input.role,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      invitedById: input.invitedById,
    })
    .returning();

  return { invite, token };
}

export async function getInviteByToken(token: string) {
  const [invite] = await db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.tokenHash, hashToken(token)),
        isNull(invites.acceptedAt),
        isNull(invites.revokedAt),
        gt(invites.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return invite ?? null;
}

export async function acceptInvite(input: { token: string; name: string; password: string }) {
  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(invites)
      .where(eq(invites.tokenHash, hashToken(input.token)))
      .limit(1)
      .for("update");

    if (!invite) throw new AppError("This invitation link is invalid.", "INVALID_INVITE");
    if (invite.acceptedAt) throw new AppError("This invitation has already been used.", "USED_INVITE");
    if (invite.revokedAt) throw new AppError("This invitation was revoked.", "REVOKED_INVITE");
    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new AppError("This invitation has expired. Ask an administrator for a new link.", "EXPIRED_INVITE");
    }

    const [existing] = await tx
      .select()
      .from(users)
      .where(eq(users.email, invite.email))
      .limit(1);
    if (existing) throw new AppError("That person already has an account.", "EXISTING_USER");

    const [user] = await tx
      .insert(users)
      .values({
        name: normalizeName(input.name),
        email: invite.email,
        passwordHash: await hashPassword(input.password),
        role: invite.role,
        status: "active",
      })
      .returning();

    await tx
      .update(invites)
      .set({ acceptedAt: new Date() })
      .where(eq(invites.id, invite.id));

    return user;
  });
}

export async function revokeInvite(inviteId: string) {
  const [updated] = await db
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(and(eq(invites.id, inviteId), isNull(invites.acceptedAt), isNull(invites.revokedAt)))
    .returning();
  if (!updated) throw new AppError("Invitation not found or already used.", "NOT_FOUND");
  return updated;
}

export async function listPendingInvites() {
  return db
    .select()
    .from(invites)
    .where(and(isNull(invites.acceptedAt), isNull(invites.revokedAt), gt(invites.expiresAt, new Date())))
    .orderBy(desc(invites.createdAt));
}

export async function createPasswordReset(input: { userId: string; createdById: string }) {
  await db
    .delete(passwordResetTokens)
    .where(and(eq(passwordResetTokens.userId, input.userId), isNull(passwordResetTokens.usedAt)));

  const token = generateToken();
  const [reset] = await db
    .insert(passwordResetTokens)
    .values({
      userId: input.userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
      createdById: input.createdById,
    })
    .returning();

  return { reset, token };
}

export async function getPasswordResetByToken(token: string) {
  const [row] = await db
    .select({
      reset: passwordResetTokens,
      user: users,
    })
    .from(passwordResetTokens)
    .innerJoin(users, eq(passwordResetTokens.userId, users.id))
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function resetPasswordWithToken(input: { token: string; password: string }) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        reset: passwordResetTokens,
        user: users,
      })
      .from(passwordResetTokens)
      .innerJoin(users, eq(passwordResetTokens.userId, users.id))
      .where(eq(passwordResetTokens.tokenHash, hashToken(input.token)))
      .limit(1)
      .for("update");

    if (!row) throw new AppError("This reset link is invalid.", "INVALID_RESET");
    if (row.reset.usedAt) throw new AppError("This reset link has already been used.", "USED_RESET");
    if (row.reset.expiresAt.getTime() <= Date.now()) {
      throw new AppError("This reset link has expired. Ask an administrator for a new one.", "EXPIRED_RESET");
    }

    const [updated] = await tx
      .update(users)
      .set({
        passwordHash: await hashPassword(input.password),
        sessionVersion: sql`${users.sessionVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, row.user.id))
      .returning();

    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, row.reset.id));

    return updated as User;
  });
}
