import { describe, expect, it } from "vitest";
import {
  normalizeDomain,
  normalizeEmail,
  normalizeTags,
} from "@/lib/auth/normalize";

describe("normalization", () => {
  it("normalizes emails", () => {
    expect(normalizeEmail("  Alex@Example.COM ")).toBe("alex@example.com");
  });

  it("normalizes domains from URLs and www prefixes", () => {
    expect(normalizeDomain("https://www.Acme.COM/path?q=1")).toBe("acme.com");
    expect(normalizeDomain("http://acme.com:8080")).toBe("acme.com");
    expect(normalizeDomain("")).toBeNull();
  });

  it("trims, lowercases, and deduplicates tags", () => {
    expect(normalizeTags(["Enterprise", " enterprise ", "VIP", ""])).toEqual([
      "enterprise",
      "vip",
    ]);
  });
});
