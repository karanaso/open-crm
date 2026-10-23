import { z } from "zod";
import { optionalText, optionalUuidSchema, requiredText } from "@/lib/validation/common";

export const dealSchema = z.object({
  name: requiredText(200),
  companyId: z.string().uuid("validation.selectCompany"),
  contactId: optionalUuidSchema,
  pipelineId: z.string().uuid("validation.selectPipeline"),
  stageId: z.string().uuid("validation.selectStage"),
  ownerId: optionalUuidSchema,
  amount: z.coerce
    .number()
    .min(0, "validation.amountNonNegative")
    .max(999_999_999_999, "validation.amountTooLarge")
    .refine((value) => Number(value.toFixed(2)) === value, "validation.amountDecimals"),
  expectedCloseDate: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  description: optionalText(5000),
  lostReason: optionalText(1000),
});

export type DealInput = z.infer<typeof dealSchema>;

export const dealMoveSchema = z.object({
  dealId: z.string().uuid(),
  stageId: z.string().uuid(),
  lostReason: z.string().trim().max(1000).optional().nullable(),
  expectedUpdatedAt: z.string().optional(),
});

export const dealListParamsSchema = z.object({
  q: z.string().trim().optional().default(""),
  pipelineId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  status: z.enum(["open", "won", "lost"]).optional(),
  ownerId: z.string().uuid().optional(),
  closeFrom: z.string().optional(),
  closeTo: z.string().optional(),
  sort: z.enum(["updated", "amount_desc", "amount_asc", "close_date"]).optional().default("updated"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const pipelineSchema = z.object({
  name: requiredText(120),
});

export const stageSchema = z.object({
  name: requiredText(120),
  probability: z.coerce.number().int().min(0).max(100),
  outcome: z.enum(["open", "won", "lost"]),
  position: z.coerce.number().int().min(0).default(0),
});
