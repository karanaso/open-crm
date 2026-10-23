import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import el from "../../messages/el.json";
import {
  compareCatalogs,
  extractPlaceholders,
  flattenCatalog,
} from "@/i18n/catalog";

describe("i18n catalog checks", () => {
  it("accepts the committed catalogs", () => {
    expect(compareCatalogs(en, el)).toEqual([]);
  });

  it("flattens nested keys", () => {
    expect(flattenCatalog({ a: { b: "value" }, c: "other" })).toEqual(
      new Map([
        ["a.b", "value"],
        ["c", "other"],
      ]),
    );
  });

  it("extracts placeholders, including ICU expressions", () => {
    expect(extractPlaceholders("Hello {name}, you have {count, plural, one {# task} other {# tasks}}")).toEqual([
      "count",
      "name",
    ]);
  });

  it("reports missing and extra keys", () => {
    const issues = compareCatalogs({ a: "A", b: "B" }, { a: "A", c: "C" });
    expect(issues).toEqual([
      { type: "missing", locale: "el", key: "b" },
      { type: "extra", locale: "el", key: "c" },
    ]);
  });

  it("reports empty values", () => {
    expect(compareCatalogs({ a: "A" }, { a: "  " })).toEqual([
      { type: "empty", locale: "el", key: "a" },
    ]);
  });

  it("reports placeholder mismatches", () => {
    expect(compareCatalogs({ a: "Hello {name}" }, { a: "Γεια {onoma}" })).toEqual([
      {
        type: "placeholder",
        locale: "el",
        key: "a",
        detail: "expected {name}, found {onoma}",
      },
    ]);
  });
});
