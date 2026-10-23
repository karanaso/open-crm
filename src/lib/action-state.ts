import type { z } from "zod";

export type ImportReport = {
  target: "companies" | "contacts";
  imported: number;
  skipped: number;
  duplicates: number;
  errors: Array<{ row: number; message: string }>;
};

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
  inviteUrl?: string;
  resetUrl?: string;
  report?: ImportReport;
} | null;

export function fieldErrorsFromZod(error: z.ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return fieldErrors;
}

export function sanitizeCallbackUrl(value: string | null | undefined) {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  if (value.startsWith("/login") || value.startsWith("/setup")) return "/dashboard";
  return value;
}
