import { z } from "zod";
import { normalizeEmail, normalizeTags } from "@/lib/auth/normalize";
import {
  optionalText,
  optionalUuidSchema,
  requiredText,
  tagSchema,
} from "@/lib/validation/common";

export const contactSchema = z.object({
  firstName: requiredText(120),
  lastName: requiredText(120),
  email: z
    .string()
    .trim()
    .min(1, "validation.emailRequired")
    .email("validation.email")
    .transform(normalizeEmail),
  phone: optionalText(40),
  jobTitle: optionalText(120),
  companyId: optionalUuidSchema,
  ownerId: optionalUuidSchema,
  notes: optionalText(5000),
  tags: tagSchema.optional().default([]).transform(normalizeTags),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const contactListParamsSchema = z.object({
  q: z.string().trim().optional().default(""),
  ownerId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  tag: z.string().trim().optional(),
  archived: z.enum(["active", "archived", "all"]).optional().default("active"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
