import { z } from "zod";
import { optionalText, optionalUuidSchema } from "@/lib/validation/common";

export const VIEWING_STATUSES = ["scheduled", "completed", "cancelled", "no_show"] as const;

export type ViewingStatus = (typeof VIEWING_STATUSES)[number];

const emptyToUndefined = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (typeof value === "string" && value.trim() === "")
    ? undefined
    : value;

export const viewingInputSchema = z.object({
  listingId: z.string().uuid("validation.uuid"),
  contactId: z.string().uuid("validation.uuid"),
  agentId: optionalUuidSchema,
  scheduledAt: z
    .string()
    .trim()
    .min(1, "validation.required")
    .refine((value) => !Number.isNaN(Date.parse(value)), "validation.invalid"),
  durationMinutes: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1, "validation.min").max(480, "validation.max").default(30),
  ),
  status: z.preprocess(emptyToUndefined, z.enum(VIEWING_STATUSES).default("scheduled")),
  notes: optionalText(2000),
});

export type ViewingInput = z.infer<typeof viewingInputSchema>;

export const viewingStatusSchema = z.object({
  viewingId: z.string().uuid("validation.uuid"),
  status: z.enum(VIEWING_STATUSES),
});

export type ViewingStatusInput = z.infer<typeof viewingStatusSchema>;
