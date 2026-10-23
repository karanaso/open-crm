import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "member";
      sessionVersion: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: "admin" | "member";
    sessionVersion: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "admin" | "member";
    sessionVersion?: number;
  }
}
