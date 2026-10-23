import { z } from "zod";
import { normalizeDomain, normalizeTags } from "@/lib/auth/normalize";
import {
  optionalText,
  optionalUuidSchema,
  requiredText,
  tagSchema,
} from "@/lib/validation/common";

export const companySchema = z.object({
  name: requiredText("Company name", 200),
  domain: optionalText(253).transform((value) => normalizeDomain(value)),
  industry: optionalText(120),
  employeeCount: z
    .union([z.coerce.number().int().min(0).max(10_000_000), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value === "" || value === null || value === undefined ? null : value)),
  phone: optionalText(40),
  website: optionalText(500),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(120),
  region: optionalText(120),
  postalCode: optionalText(30),
  country: optionalText(120),
  description: optionalText(5000),
  ownerId: optionalUuidSchema,
  tags: tagSchema.optional().default([]).transform(normalizeTags),
});

export type CompanyInput = z.infer<typeof companySchema>;

export const companyListParamsSchema = z.object({
  q: z.string().trim().optional().default(""),
  ownerId: z.string().uuid().optional(),
  tag: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  archived: z.enum(["active", "archived", "all"]).optional().default("active"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
