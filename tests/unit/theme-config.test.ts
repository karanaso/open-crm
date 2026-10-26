import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  DEFAULT_THEME_MODE,
  THEME_MODES,
  THEMES,
  isTheme,
  isThemeMode,
  resolveThemePreference,
} from "@/lib/theme/config";

describe("theme config", () => {
  it("lists the supported themes and modes", () => {
    expect(THEMES).toEqual(["default", "violet", "emerald", "amber", "rose"]);
    expect(THEME_MODES).toEqual(["light", "dark", "system"]);
    expect(DEFAULT_THEME).toBe("default");
    expect(DEFAULT_THEME_MODE).toBe("system");
  });

  it("guards supported and unsupported values", () => {
    for (const theme of THEMES) {
      expect(isTheme(theme)).toBe(true);
    }
    for (const mode of THEME_MODES) {
      expect(isThemeMode(mode)).toBe(true);
    }

    expect(isTheme("blue")).toBe(false);
    expect(isTheme("")).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
    expect(isThemeMode("auto")).toBe(false);
    expect(isThemeMode("SYSTEM")).toBe(false);
    expect(isThemeMode(null)).toBe(false);
  });

  it("keeps valid preference pairs", () => {
    expect(resolveThemePreference({ theme: "rose", mode: "dark" })).toEqual({
      theme: "rose",
      mode: "dark",
    });
  });

  it("falls back to the defaults for missing or unsupported values", () => {
    expect(resolveThemePreference({})).toEqual({ theme: "default", mode: "system" });
    expect(resolveThemePreference({ theme: "blue", mode: "auto" })).toEqual({
      theme: "default",
      mode: "system",
    });
    expect(resolveThemePreference({ theme: null, mode: null })).toEqual({
      theme: "default",
      mode: "system",
    });
  });

  it("resolves each value independently", () => {
    expect(resolveThemePreference({ theme: "violet", mode: "invalid" })).toEqual({
      theme: "violet",
      mode: "system",
    });
    expect(resolveThemePreference({ theme: "invalid", mode: "light" })).toEqual({
      theme: "default",
      mode: "light",
    });
  });
});
