import { z } from "zod";

export const uuidSchema = z.string().uuid("Select a valid record");

export const optionalUuidSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value ? value : null))
  .pipe(z.string().uuid().nullable());

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

export const requiredText = (label: string, max = 500) =>
  z.string().trim().min(1, `${label} is required`).max(max);

export const tagSchema = z
  .array(z.string().trim().min(1).max(40, "Tags must be at most 40 characters"))
  .max(20, "A record can have at most 20 tags");

export function parseTagInput(value: FormDataEntryValue | null | undefined) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export const pageSchema = z.coerce.number().int().min(1).default(1);
export const pageSizeSchema = z.coerce.number().int().min(1).max(100).default(20);
