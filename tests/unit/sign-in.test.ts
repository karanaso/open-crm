import { describe, expect, it } from "vitest";
import { hasSignInError } from "@/lib/auth/sign-in";

describe("sign-in result", () => {
  it("accepts a successful callback URL", () => {
    expect(hasSignInError("/dashboard")).toBe(false);
    expect(hasSignInError("http://localhost:3000/dashboard")).toBe(false);
  });

  it("rejects a missing URL", () => {
    expect(hasSignInError(undefined)).toBe(true);
    expect(hasSignInError("")).toBe(true);
  });

  it("rejects an Auth.js error callback", () => {
    expect(hasSignInError("/login?error=CredentialsSignin&code=credentials")).toBe(true);
  });
});
