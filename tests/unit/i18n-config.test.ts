import { describe, expect, it } from "vitest";
import { defaultLocale, isLocale, resolveLocale } from "@/i18n/config";

describe("i18n config", () => {
  it("recognizes supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("el")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it("uses a valid cookie before the browser preference", () => {
    expect(resolveLocale({ cookie: "el", acceptLanguage: "en-US,en;q=0.9" })).toBe("el");
  });

  it("falls back to the first supported browser language", () => {
    expect(resolveLocale({ cookie: "fr", acceptLanguage: "fr-FR,el-GR;q=0.8,en;q=0.5" })).toBe(
      "el",
    );
  });

  it("uses English when nothing is available", () => {
    expect(resolveLocale({})).toBe(defaultLocale);
    expect(resolveLocale({ cookie: null, acceptLanguage: null })).toBe("en");
  });

  it("ignores unsupported values", () => {
    expect(resolveLocale({ cookie: "de", acceptLanguage: "de-DE,fr;q=0.8" })).toBe("en");
  });
});
