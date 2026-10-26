import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/theme/cookie", () => ({
  setThemeCookies: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/services/users", () => ({
  updateUserTheme: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { setThemeAction } from "@/actions/theme";
import { getCurrentUser } from "@/lib/auth/guards";
import { updateUserTheme } from "@/lib/services/users";
import { setThemeCookies } from "@/lib/theme/cookie";
import { revalidatePath } from "next/cache";

const setThemeCookiesMock = vi.mocked(setThemeCookies);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const updateUserThemeMock = vi.mocked(updateUserTheme);
const revalidatePathMock = vi.mocked(revalidatePath);

describe("setThemeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue(null);
    updateUserThemeMock.mockResolvedValue({} as never);
  });

  it("writes cookies and updates the signed-in user", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" } as never);

    await expect(setThemeAction("violet", "dark")).resolves.toEqual({
      theme: "violet",
      mode: "dark",
    });
    expect(setThemeCookiesMock).toHaveBeenCalledWith("violet", "dark");
    expect(updateUserThemeMock).toHaveBeenCalledWith("user-1", "violet", "dark");
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });

  it("sets the cookie without a database update for a visitor", async () => {
    await expect(setThemeAction("rose", "light")).resolves.toEqual({
      theme: "rose",
      mode: "light",
    });
    expect(setThemeCookiesMock).toHaveBeenCalledWith("rose", "light");
    expect(updateUserThemeMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");
  });

  it("rejects an unsupported theme or mode without writing anything", async () => {
    await expect(setThemeAction("blue", "light")).resolves.toEqual({
      error: { key: "errors.INVALID_THEME" },
    });
    await expect(setThemeAction("violet", "auto")).resolves.toEqual({
      error: { key: "errors.INVALID_THEME" },
    });

    expect(setThemeCookiesMock).not.toHaveBeenCalled();
    expect(getCurrentUserMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns a generic error when the profile update fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getCurrentUserMock.mockResolvedValue({ id: "user-1" } as never);
    updateUserThemeMock.mockRejectedValue(new Error("database unavailable"));

    await expect(setThemeAction("amber", "system")).resolves.toEqual({
      error: { key: "errors.GENERIC" },
    });
    expect(setThemeCookiesMock).toHaveBeenCalledWith("amber", "system");
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout");

    consoleError.mockRestore();
  });
});
