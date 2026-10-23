import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { authConfig } from "@/auth.config";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { clearLoginAttempts, isLoginLocked, recordFailedLogin } from "@/lib/auth/login-throttle";
import { normalizeEmail } from "@/lib/auth/normalize";
import { loginSchema } from "@/lib/validation/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = normalizeEmail(parsed.data.email);
        if (await isLoginLocked(email)) return null;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user || user.status !== "active") {
          await recordFailedLogin(email);
          return null;
        }

        const valid = await verifyPassword(user.passwordHash, parsed.data.password);
        if (!valid) {
          await recordFailedLogin(email);
          return null;
        }

        await clearLoginAttempts(email);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
});
