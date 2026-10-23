import type { ZodIssue } from "zod";
import type { MessageDescriptor } from "@/lib/errors";

export function zodIssueDescriptor(issue: ZodIssue): MessageDescriptor {
  const params: Record<string, number> = {};
  if ("minimum" in issue && typeof issue.minimum === "number") params.min = issue.minimum;
  if ("maximum" in issue && typeof issue.maximum === "number") params.max = issue.maximum;
  const withParams = Object.keys(params).length > 0 ? { params } : {};

  if (issue.message.startsWith("validation.")) {
    return { key: issue.message, ...withParams };
  }

  switch (issue.code) {
    case "invalid_type":
      return { key: "validation.required" };
    case "too_small":
      if (issue.origin === "string" && issue.minimum === 1) {
        return { key: "validation.required" };
      }
      return {
        key: issue.origin === "string" ? "validation.minLength" : "validation.min",
        params,
      };
    case "too_big":
      return {
        key: issue.origin === "string" ? "validation.maxLength" : "validation.max",
        params,
      };
    case "invalid_format":
      if (issue.format === "email") return { key: "validation.email" };
      if (issue.format === "uuid") return { key: "validation.uuid" };
      return { key: "validation.invalid" };
    case "invalid_value":
      return { key: "validation.option" };
    default:
      return { key: "validation.invalid" };
  }
}
