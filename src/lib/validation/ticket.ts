import { z } from "zod";
import { optionalUuidSchema, requiredText } from "@/lib/validation/common";

export const ticketSchema = z.object({
  subject: requiredText(300),
  description: requiredText(10000),
  requesterContactId: z.string().uuid("validation.selectRequester"),
  priority: z.enum(["urgent", "high", "normal", "low"]).default("normal"),
  assigneeId: optionalUuidSchema,
});

export type TicketInput = z.infer<typeof ticketSchema>;

export const ticketStatusSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(["open", "in_progress", "pending", "resolved", "closed"]),
});

export const ticketAssignSchema = z.object({
  ticketId: z.string().uuid(),
  assigneeId: optionalUuidSchema,
});

export const ticketPrioritySchema = z.object({
  ticketId: z.string().uuid(),
  priority: z.enum(["urgent", "high", "normal", "low"]),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, "validation.commentRequired").max(5000),
  visibility: z.enum(["reply", "internal"]).default("reply"),
});

export const ticketListParamsSchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(["open", "in_progress", "pending", "resolved", "closed", "active"]).optional(),
  priority: z.enum(["urgent", "high", "normal", "low"]).optional(),
  assigneeId: z.string().uuid().optional(),
  unassigned: z.coerce.boolean().optional(),
  overdue: z.coerce.boolean().optional(),
  companyId: z.string().uuid().optional(),
  requesterId: z.string().uuid().optional(),
  sort: z.enum(["updated", "created", "priority", "sla"]).optional().default("updated"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
