import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { setupFirstAdmin } from "@/lib/services/setup";
import {
  acceptInvite,
  createInvite,
  createPasswordReset,
  resetPasswordWithToken,
} from "@/lib/services/invites";
import {
  changePassword,
  changeUserRole,
  findUserByEmail,
  findUserById,
  setUserStatus,
  updateUserLocale,
} from "@/lib/services/users";
import { verifyPassword } from "@/lib/auth/password";
import {
  clearLoginAttempts,
  isLoginLocked,
  recordFailedLogin,
} from "@/lib/auth/login-throttle";
import { resetDatabase } from "./helpers";
import { createUser } from "./factories";

describe("workspace access", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates the first admin once and seeds the default pipeline", async () => {
    const admin = await setupFirstAdmin({
      name: "Alex Morgan",
      email: "alex@example.com",
      password: "AdminPassword123!",
    });
    expect(admin.role).toBe("admin");
    expect(admin.status).toBe("active");

    await expect(
      setupFirstAdmin({
        name: "Second Admin",
        email: "second@example.com",
        password: "AdminPassword123!",
      }),
    ).rejects.toThrow("Setup is already complete");
  });

  it("stores the locale selected during setup", async () => {
    const admin = await setupFirstAdmin({
      name: "Greek Admin",
      email: "greek-admin@example.com",
      password: "AdminPassword123!",
      locale: "el",
    });
    expect(admin.locale).toBe("el");
  });

  it("serializes concurrent setup attempts", async () => {
    const results = await Promise.allSettled([
      setupFirstAdmin({
        name: "First",
        email: "first@example.com",
        password: "AdminPassword123!",
      }),
      setupFirstAdmin({
        name: "Second",
        email: "second@example.com",
        password: "AdminPassword123!",
      }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
  });

  it("accepts an invitation exactly once", async () => {
    const admin = await createUser({ role: "admin" });
    const { token } = await createInvite({
      email: "new@example.com",
      role: "member",
      invitedById: admin.id,
    });

    const user = await acceptInvite({
      token,
      name: "New Member",
      password: "MemberPassword123!",
      locale: "el",
    });
    expect(user.email).toBe("new@example.com");
    expect(user.role).toBe("member");
    expect(user.locale).toBe("el");
    expect(await verifyPassword(user.passwordHash, "MemberPassword123!")).toBe(true);

    await expect(
      acceptInvite({ token, name: "Again", password: "MemberPassword123!" }),
    ).rejects.toThrow("already been used");
  });

  it("rejects an invitation for an existing account", async () => {
    const admin = await createUser({ role: "admin" });
    await expect(
      createInvite({ email: admin.email, role: "member", invitedById: admin.id }),
    ).rejects.toThrow("already has an account");
  });

  it("resets a password with a single-use link", async () => {
    const user = await createUser();
    const { token } = await createPasswordReset({
      userId: user.id,
      createdById: user.id,
    });

    const updated = await resetPasswordWithToken({
      token,
      password: "ResetPassword123!",
    });
    expect(updated.sessionVersion).toBe(user.sessionVersion + 1);
    expect(await verifyPassword(updated.passwordHash, "ResetPassword123!")).toBe(true);

    await expect(
      resetPasswordWithToken({ token, password: "AnotherPassword123!" }),
    ).rejects.toThrow("already been used");
  });

  it("invalidates other sessions when the password changes", async () => {
    const user = await createUser();
    const updated = await changePassword(user, "TestPassword123!", "ChangedPassword123!");
    expect(updated.sessionVersion).toBe(user.sessionVersion + 1);
    expect(await verifyPassword(updated.passwordHash, "ChangedPassword123!")).toBe(true);
    await expect(changePassword(updated, "TestPassword123!", "OtherPassword123!")).rejects.toThrow(
      "current password is incorrect",
    );
  });

  it("protects the last active administrator", async () => {
    const admin = await createUser({ role: "admin" });
    await expect(changeUserRole(admin.id, admin.id, "member")).rejects.toThrow(
      "last active administrator",
    );

    const secondAdmin = await createUser({ role: "admin" });
    await expect(setUserStatus(admin.id, admin.id, "inactive")).rejects.toThrow(
      "deactivate your own account",
    );
    const demoted = await changeUserRole(admin.id, admin.id, "member");
    expect(demoted.role).toBe("member");
    expect(secondAdmin.role).toBe("admin");
  });

  it("deactivation increments the session version", async () => {
    const admin = await createUser({ role: "admin" });
    const member = await createUser();
    const updated = await setUserStatus(admin.id, member.id, "inactive");
    expect(updated.status).toBe("inactive");
    expect(updated.sessionVersion).toBe(member.sessionVersion + 1);
  });

  it("locks sign-in after five failures and unlocks after the window", async () => {
    const now = new Date("2026-10-21T12:00:00Z");
    for (let index = 0; index < 5; index += 1) {
      await recordFailedLogin("user@example.com", now);
    }
    expect(await isLoginLocked("user@example.com", new Date("2026-10-21T12:10:00Z"))).toBe(true);
    expect(await isLoginLocked("user@example.com", new Date("2026-10-21T12:16:00Z"))).toBe(false);

    await clearLoginAttempts("user@example.com");
    expect(await isLoginLocked("user@example.com", now)).toBe(false);
  });

  it("normalizes email lookups", async () => {
    const user = await createUser({ email: "mixed.case@example.com" });
    expect((await findUserByEmail("MIXED.CASE@EXAMPLE.COM"))?.id).toBe(user.id);
    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    expect(row.email).toBe("mixed.case@example.com");
  });

  it("defaults new accounts to English", async () => {
    const user = await createUser();
    expect(user.locale).toBe("en");
  });

  it("stores a Greek locale preference", async () => {
    const user = await createUser({ locale: "el" });
    expect(user.locale).toBe("el");
  });

  it("persists a locale preference change", async () => {
    const user = await createUser();
    const updated = await updateUserLocale(user.id, "el");
    expect(updated.locale).toBe("el");
    expect((await findUserById(user.id))?.locale).toBe("el");
  });
});
