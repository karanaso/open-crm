import { z } from "zod";
import { normalizeTags } from "@/lib/auth/normalize";
import { optionalText, optionalUuidSchema, requiredText } from "@/lib/validation/common";

export const segmentCriteriaSchema = z
  .object({
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    industry: z.string().trim().max(120).optional(),
    jobTitle: z.string().trim().max(120).optional(),
    ownerId: z.string().uuid().optional(),
    createdFrom: z.string().optional(),
    createdTo: z.string().optional(),
  })
  .refine((criteria) => Object.values(criteria).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value)), {
    message: "validation.segmentCriteria",
  })
  .transform((criteria) => ({
    ...criteria,
    tags: criteria.tags ? normalizeTags(criteria.tags) : undefined,
  }));

export const segmentSchema = z.object({
  name: requiredText(160),
  description: optionalText(2000),
  criteria: segmentCriteriaSchema,
});

export type SegmentInput = z.infer<typeof segmentSchema>;

export const campaignSchema = z
  .object({
    name: requiredText(200),
    channel: z.enum(["email", "phone", "event", "social", "other"]),
    segmentId: z.string().uuid("validation.selectSegment"),
    ownerId: optionalUuidSchema,
    budget: z.coerce.number().min(0, "validation.budgetNonNegative").default(0),
    startDate: z.string().trim().optional().nullable(),
    endDate: z.string().trim().optional().nullable(),
    description: optionalText(5000),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
    { message: "validation.endDateBeforeStart", path: ["endDate"] },
  )
  .transform((data) => ({
    ...data,
    startDate: data.startDate || null,
    endDate: data.endDate || null,
  }));

export type CampaignInput = z.infer<typeof campaignSchema>;

export const recipientStatusSchema = z.object({
  recipientId: z.string().uuid(),
  status: z.enum(["targeted", "sent", "opened", "clicked", "responded", "converted"]),
});

export const campaignListParamsSchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  channel: z.enum(["email", "phone", "event", "social", "other"]).optional(),
  ownerId: z.string().uuid().optional(),
  sort: z.enum(["updated", "name", "start_date"]).optional().default("updated"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
