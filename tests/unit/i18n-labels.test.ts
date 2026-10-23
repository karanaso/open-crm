import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import el from "../../messages/el.json";
import { flattenCatalog } from "@/i18n/catalog";
import { enumLabelKey, enumLabelKeys } from "@/i18n/labels";
import { NAV_ITEMS } from "@/lib/constants";

const enKeys = flattenCatalog(en);
const elKeys = flattenCatalog(el);

describe("enum and navigation labels", () => {
  it("has a catalog key for every enum value in both locales", () => {
    for (const [group, values] of Object.entries(enumLabelKeys) as [
      string,
      Record<string, string>,
    ][]) {
      for (const [value, key] of Object.entries(values)) {
        expect(enKeys.has(key), `${group}.${value} in en`).toBe(true);
        expect(elKeys.has(key), `${group}.${value} in el`).toBe(true);
      }
    }
  });

  it("returns the typed key for an enum value", () => {
    expect(enumLabelKey("ticketStatus", "in_progress")).toBe(
      "enums.ticketStatus.in_progress",
    );
    expect(enumLabelKey("role", "admin")).toBe("enums.role.admin");
  });

  it("has a nav label for every navigation item", () => {
    for (const item of NAV_ITEMS) {
      expect(enKeys.has(`nav.${item.labelKey}`), item.labelKey).toBe(true);
      expect(elKeys.has(`nav.${item.labelKey}`), item.labelKey).toBe(true);
    }
  });
});
