import { describe, expect, it } from "vitest";
import { themePreferenceSchema } from "@/lib/validation/theme";

describe("theme preference validation", () => {
  it("accepts every supported combination", () => {
    for (const theme of ["default", "violet", "emerald", "amber", "rose"]) {
      for (const mode of ["light", "dark", "system"]) {
        expect(themePreferenceSchema.safeParse({ theme, mode }).success).toBe(true);
      }
    }
  });

  it("rejects an unsupported theme", () => {
    const result = themePreferenceSchema.safeParse({ theme: "blue", mode: "light" });
    expect(result.success).toBe(false);
  });

  it("rejects an unsupported mode", () => {
    const result = themePreferenceSchema.safeParse({ theme: "violet", mode: "auto" });
    expect(result.success).toBe(false);
  });

  it("rejects missing values", () => {
    expect(themePreferenceSchema.safeParse({ theme: "default" }).success).toBe(false);
    expect(themePreferenceSchema.safeParse({ mode: "dark" }).success).toBe(false);
    expect(themePreferenceSchema.safeParse({}).success).toBe(false);
  });
});
