import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import en from "../../messages/en.json";
import el from "../../messages/el.json";
import { flattenCatalog } from "@/i18n/catalog";
import {
  AppError,
  ERROR_CODES,
  errorCode,
  errorDescriptor,
} from "@/lib/errors";
import { fieldErrorsFromZod } from "@/lib/action-state";
import { zodIssueDescriptor } from "@/lib/validation/zod-errors";

function issueOf(schema: z.ZodType, value: unknown) {
  const result = schema.safeParse(value);
  if (result.success) throw new Error("expected validation to fail");
  return result.error.issues[0];
}

describe("error descriptors", () => {
  it("maps AppError codes and params", () => {
    expect(errorDescriptor(new AppError("Not found", "NOT_FOUND"))).toEqual({
      key: "errors.NOT_FOUND",
      params: undefined,
    });
    expect(errorDescriptor(new AppError("Conflict", "CONFLICT", { id: "x" }))).toEqual({
      key: "errors.CONFLICT",
      params: { id: "x" },
    });
  });

  it("falls back to a generic code for unknown AppError codes", () => {
    expect(errorDescriptor(new AppError("Custom", "SOMETHING_NEW"))).toEqual({
      key: "errors.GENERIC",
      params: undefined,
    });
  });

  it("maps authorization errors by name", () => {
    const unauthorized = new Error("Unauthorized");
    unauthorized.name = "UnauthorizedError";
    const forbidden = new Error("Forbidden");
    forbidden.name = "ForbiddenError";
    expect(errorDescriptor(unauthorized).key).toBe("errors.UNAUTHORIZED");
    expect(errorDescriptor(forbidden).key).toBe("errors.FORBIDDEN");
  });

  it("maps unknown errors to the generic message and logs them", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(errorDescriptor(new Error("boom")).key).toBe("errors.GENERIC");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("exposes the code without the namespace", () => {
    expect(errorCode(new AppError("Not found", "NOT_FOUND"))).toBe("NOT_FOUND");
  });

  it("has catalog entries for every error code", () => {
    const enKeys = flattenCatalog(en);
    const elKeys = flattenCatalog(el);
    for (const code of ERROR_CODES) {
      expect(enKeys.has(`errors.${code}`), `errors.${code} in en`).toBe(true);
      expect(elKeys.has(`errors.${code}`), `errors.${code} in el`).toBe(true);
    }
  });
});

describe("zod issue descriptors", () => {
  it("maps required fields", () => {
    expect(zodIssueDescriptor(issueOf(z.string().min(1), ""))).toEqual({
      key: "validation.required",
    });
  });

  it("maps string length limits with params", () => {
    expect(zodIssueDescriptor(issueOf(z.string().min(12), "short"))).toEqual({
      key: "validation.minLength",
      params: { min: 12 },
    });
    expect(zodIssueDescriptor(issueOf(z.string().max(5), "too long"))).toEqual({
      key: "validation.maxLength",
      params: { max: 5 },
    });
  });

  it("maps numeric limits with params", () => {
    expect(zodIssueDescriptor(issueOf(z.coerce.number().min(5), 1))).toEqual({
      key: "validation.min",
      params: { min: 5 },
    });
    expect(zodIssueDescriptor(issueOf(z.coerce.number().max(5), 6))).toEqual({
      key: "validation.max",
      params: { max: 5 },
    });
  });

  it("maps email and uuid formats", () => {
    expect(zodIssueDescriptor(issueOf(z.string().email(), "nope"))).toEqual({
      key: "validation.email",
    });
    expect(zodIssueDescriptor(issueOf(z.string().uuid(), "nope"))).toEqual({
      key: "validation.uuid",
    });
  });

  it("preserves custom validation keys and params", () => {
    expect(
      zodIssueDescriptor(issueOf(z.string().min(12, "validation.passwordMin"), "short")),
    ).toEqual({
      key: "validation.passwordMin",
      params: { min: 12 },
    });
  });

  it("builds field errors by path", () => {
    const result = z.object({ email: z.string().email() }).safeParse({ email: "nope" });
    if (result.success) throw new Error("expected validation to fail");
    expect(fieldErrorsFromZod(result.error)).toEqual({
      email: [{ key: "validation.email" }],
    });
  });
});
