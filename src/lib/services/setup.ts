import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { normalizeEmail, normalizeName } from "@/lib/auth/normalize";
import { ensureDefaultPipeline } from "@/db/ensure-default-pipeline";
import { AppError } from "@/lib/errors";

export async function setupFirstAdmin(input: {
  name: string;
  email: string;
  password: string;
  locale?: "en" | "el";
}) {
  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(918273645)`);

    const [row] = await tx.select({ count: sql<number>`count(*)::int` }).from(users);
    if ((row?.count ?? 0) > 0) {
      throw new AppError("Setup is already complete. Sign in instead.", "SETUP_COMPLETE");
    }

    const [user] = await tx
      .insert(users)
      .values({
        name: normalizeName(input.name),
        email: normalizeEmail(input.email),
        passwordHash: await hashPassword(input.password),
        role: "admin",
        status: "active",
        locale: input.locale ?? "en",
      })
      .returning();

    return user;
  });

  await ensureDefaultPipeline();
  return created;
}
