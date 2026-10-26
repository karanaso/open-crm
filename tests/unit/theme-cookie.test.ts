import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.get, set: mocks.set }),
}));

import { getThemePreference, setThemeCookies, syncThemeCookiesForUser } from "@/lib/theme/cookie";
import {
  DEFAULT_THEME,
  DEFAULT_THEME_MODE,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  THEME_MODE_COOKIE,
} from "@/lib/theme/config";

describe("theme cookies", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.set.mockClear();
  });

  it("reads a valid preference", async () => {
    mocks.get.mockImplementation((name: string) =>
      name === THEME_COOKIE ? { value: "violet" } : { value: "dark" },
    );

    await expect(getThemePreference()).resolves.toEqual({ theme: "violet", mode: "dark" });
  });

  it("falls back for missing or malformed values", async () => {
    mocks.get.mockReturnValue(undefined);
    await expect(getThemePreference()).resolves.toEqual({
      theme: DEFAULT_THEME,
      mode: DEFAULT_THEME_MODE,
    });

    mocks.get.mockImplementation((name: string) =>
      name === THEME_COOKIE ? { value: "blue" } : { value: "auto" },
    );
    await expect(getThemePreference()).resolves.toEqual({
      theme: DEFAULT_THEME,
      mode: DEFAULT_THEME_MODE,
    });
  });

  it("writes readable one-year cookies", async () => {
    await setThemeCookies("emerald", "light");

    expect(mocks.set).toHaveBeenNthCalledWith(1, THEME_COOKIE, "emerald", {
      httpOnly: false,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: THEME_COOKIE_MAX_AGE,
    });
    expect(mocks.set).toHaveBeenNthCalledWith(2, THEME_MODE_COOKIE, "light", {
      httpOnly: false,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: THEME_COOKIE_MAX_AGE,
    });
  });

  it("synchronizes from a user preference", async () => {
    await syncThemeCookiesForUser({ theme: "rose", themeMode: "system" });

    expect(mocks.set).toHaveBeenNthCalledWith(
      1,
      THEME_COOKIE,
      "rose",
      expect.objectContaining({ maxAge: THEME_COOKIE_MAX_AGE }),
    );
    expect(mocks.set).toHaveBeenNthCalledWith(
      2,
      THEME_MODE_COOKIE,
      "system",
      expect.objectContaining({ maxAge: THEME_COOKIE_MAX_AGE }),
    );
  });

  it("synchronizes defaults for a missing user", async () => {
    await syncThemeCookiesForUser(null);

    expect(mocks.set).toHaveBeenNthCalledWith(1, THEME_COOKIE, DEFAULT_THEME, expect.anything());
    expect(mocks.set).toHaveBeenNthCalledWith(
      2,
      THEME_MODE_COOKIE,
      DEFAULT_THEME_MODE,
      expect.anything(),
    );
  });
});
