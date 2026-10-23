import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ set: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mocks.set }),
}));

import { setLocaleCookie } from "@/i18n/cookie";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/i18n/config";

describe("locale cookie", () => {
  beforeEach(() => {
    mocks.set.mockClear();
  });

  it("writes a readable, non-sensitive locale cookie", async () => {
    await setLocaleCookie("el");

    expect(mocks.set).toHaveBeenCalledWith(LOCALE_COOKIE, "el", {
      httpOnly: false,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
    });
  });
});
