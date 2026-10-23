import { z } from "zod";
import { optionalText, optionalUuidSchema, requiredText } from "@/lib/validation/common";

export const activitySchema = z
  .object({
    type: z.enum(["note", "call", "email", "meeting"]),
    subject: requiredText(300),
    body: optionalText(10000),
    occurredAt: z.string().trim().min(1, "validation.occurredAtRequired"),
    companyId: optionalUuidSchema,
    contactId: optionalUuidSchema,
    dealId: optionalUuidSchema,
    ticketId: optionalUuidSchema,
    campaignId: optionalUuidSchema,
  })
  .refine(
    (data) =>
      Boolean(data.companyId || data.contactId || data.dealId || data.ticketId || data.campaignId),
    { message: "validation.activityLinkRequired", path: ["links"] },
  );

export type ActivityInput = z.infer<typeof activitySchema>;

export const taskSchema = z
  .object({
    title: requiredText(300),
    description: optionalText(5000),
    dueDate: z.string().trim().min(1, "validation.dueDateRequired"),
    priority: z.enum(["low", "normal", "high"]).default("normal"),
    assigneeId: optionalUuidSchema,
    companyId: optionalUuidSchema,
    contactId: optionalUuidSchema,
    dealId: optionalUuidSchema,
    ticketId: optionalUuidSchema,
    campaignId: optionalUuidSchema,
  })
  .refine(
    (data) =>
      Boolean(data.companyId || data.contactId || data.dealId || data.ticketId || data.campaignId),
    { message: "validation.taskLinkRequired", path: ["links"] },
  );

export type TaskInput = z.infer<typeof taskSchema>;

export const taskListParamsSchema = z.object({
  view: z.enum(["mine", "all"]).optional().default("mine"),
  assigneeId: z.string().uuid().optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  status: z.enum(["open", "completed"]).optional(),
  recordType: z.enum(["company", "contact", "deal", "ticket", "campaign"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
