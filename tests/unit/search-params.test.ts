import { describe, expect, it } from "vitest";
import { buildHref, getPage, getPageSize, getStringArray } from "@/lib/search-params";

describe("URL search params", () => {
  it("builds hrefs while preserving existing filters", () => {
    expect(buildHref("/companies", { q: "acme", page: "2" }, { page: "3" })).toBe(
      "/companies?q=acme&page=3",
    );
  });

  it("skips empty values", () => {
    expect(buildHref("/contacts", { q: "", ownerId: undefined, page: "1" })).toBe(
      "/contacts?page=1",
    );
  });

  it("parses pages defensively", () => {
    expect(getPage({ page: "3" })).toBe(3);
    expect(getPage({ page: "0" })).toBe(1);
    expect(getPage({ page: "nope" })).toBe(1);
  });

  it("caps page size", () => {
    expect(getPageSize({ pageSize: "500" })).toBe(100);
    expect(getPageSize({ pageSize: "10" })).toBe(10);
  });

  it("parses comma-separated arrays", () => {
    expect(getStringArray({ tag: "vip,renewal" }, "tag")).toEqual(["vip", "renewal"]);
  });
});
