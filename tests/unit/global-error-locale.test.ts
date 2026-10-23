import { describe, expect, it } from "vitest";
import {
  readCookieValue,
  resolveGlobalErrorLocale,
} from "@/i18n/global-error-locale";

describe("global error locale", () => {
  it("prefers a supported locale cookie", () => {
    expect(resolveGlobalErrorLocale("el", "en-US")).toBe("el");
    expect(resolveGlobalErrorLocale("en", "el-GR")).toBe("en");
  });

  it("falls back to the browser preference", () => {
    expect(resolveGlobalErrorLocale(undefined, "el-GR")).toBe("el");
    expect(resolveGlobalErrorLocale("fr", "el-GR,en;q=0.8")).toBe("el");
  });

  it("falls back to English when nothing is supported", () => {
    expect(resolveGlobalErrorLocale("fr", "de-DE")).toBe("en");
    expect(resolveGlobalErrorLocale(undefined, undefined)).toBe("en");
    expect(resolveGlobalErrorLocale("", "")).toBe("en");
  });

  it("reads a cookie value from a cookie string", () => {
    expect(readCookieValue("a=1; opencrm_locale=el; b=2", "opencrm_locale")).toBe("el");
    expect(readCookieValue("opencrm_locale=en", "opencrm_locale")).toBe("en");
    expect(readCookieValue("a=1", "opencrm_locale")).toBeUndefined();
  });
});
