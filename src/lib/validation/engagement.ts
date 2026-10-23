import { z } from "zod";
import { optionalText, optionalUuidSchema, requiredText } from "@/lib/validation/common";

export const activitySchema = z
  .object({
    type: z.enum(["note", "call", "email", "meeting"]),
    subject: requiredText("Subject", 300),
    body: optionalText(10000),
    occurredAt: z.string().trim().min(1, "Occurred at is required"),
    companyId: optionalUuidSchema,
    contactId: optionalUuidSchema,
    dealId: optionalUuidSchema,
    ticketId: optionalUuidSchema,
    campaignId: optionalUuidSchema,
  })
  .refine(
    (data) =>
      Boolean(data.companyId || data.contactId || data.dealId || data.ticketId || data.campaignId),
    { message: "Link the activity to at least one record", path: ["links"] },
  );

export type ActivityInput = z.infer<typeof activitySchema>;

export const taskSchema = z
  .object({
    title: requiredText("Task title", 300),
    description: optionalText(5000),
    dueDate: z.string().trim().min(1, "Due date is required"),
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
    { message: "Link the task to at least one record", path: ["links"] },
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
