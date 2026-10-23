import { z } from "zod";

export const uuidSchema = z.string().uuid("validation.uuid");

export const optionalUuidSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value ? value : null))
  .pipe(z.string().uuid("validation.uuid").nullable());

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "validation.maxLength")
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

export const requiredText = (max = 500) =>
  z.string().trim().min(1, "validation.required").max(max, "validation.maxLength");

export const tagSchema = z
  .array(
    z.string().trim().min(1, "validation.required").max(40, "validation.tagLength"),
  )
  .max(20, "validation.maxTags");

export function parseTagInput(value: FormDataEntryValue | null | undefined) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export const pageSchema = z.coerce.number().int().min(1).default(1);
export const pageSizeSchema = z.coerce.number().int().min(1).max(100).default(20);
