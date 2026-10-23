import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  db: { update: vi.fn() },
}));

vi.mock("@/lib/auth/guards", () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/i18n/cookie", () => ({
  setLocaleCookie: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { setLocaleAction } from "@/actions/locale";
import { setLocaleCookie } from "@/i18n/cookie";
import { revalidatePath } from "next/cache";

const setLocaleCookieMock = vi.mocked(setLocaleCookie);

describe("setLocaleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets the cookie and revalidates for a supported locale", async () => {
    await expect(setLocaleAction("el")).resolves.toEqual({ locale: "el" });
    expect(setLocaleCookieMock).toHaveBeenCalledWith("el");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("rejects an unsupported locale without writing the cookie", async () => {
    await expect(setLocaleAction("fr")).resolves.toEqual({
      error: { key: "errors.INVALID_LOCALE" },
    });
    expect(setLocaleCookieMock).not.toHaveBeenCalled();
  });
});
