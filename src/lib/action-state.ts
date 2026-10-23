import type { z } from "zod";
import type { MessageDescriptor } from "@/lib/errors";
import { zodIssueDescriptor } from "@/lib/validation/zod-errors";

export type { MessageDescriptor } from "@/lib/errors";

export type ImportReport = {
  target: "companies" | "contacts";
  imported: number;
  skipped: number;
  duplicates: number;
  errors: Array<{ row: number; message: string | MessageDescriptor }>;
};

export type ActionState = {
  error?: MessageDescriptor;
  fieldErrors?: Record<string, MessageDescriptor[]>;
  success?: MessageDescriptor;
  inviteUrl?: string;
  resetUrl?: string;
  report?: ImportReport;
} | null;

export function fieldErrorsFromZod(error: z.ZodError) {
  const fieldErrors: Record<string, MessageDescriptor[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), zodIssueDescriptor(issue)];
  }
  return fieldErrors;
}

export function sanitizeCallbackUrl(value: string | null | undefined) {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  if (value.startsWith("/login") || value.startsWith("/setup")) return "/dashboard";
  return value;
}
