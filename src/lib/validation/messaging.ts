import { z } from "zod";
import type { MessageDescriptor } from "@/lib/errors";
import { MAX_MESSAGE_HTML_LENGTH, MAX_MESSAGE_TEXT_LENGTH } from "@/lib/messaging/limits";
import { findUnsupportedMergeFields } from "@/lib/messaging/render";
import {
  optionalText,
  optionalUuidSchema,
  pageSizeSchema,
  requiredText,
  uuidSchema,
} from "@/lib/validation/common";

export const messageGroupSchema = z.object({
  name: requiredText(160),
  description: optionalText(2000),
});

export type MessageGroupInput = z.infer<typeof messageGroupSchema>;

const audienceFields = {
  groupId: optionalUuidSchema,
  segmentId: optionalUuidSchema,
};

const optionalBody = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "validation.maxLength")
    .optional()
    .nullable()
    .transform((value) => value || null);

export const messageSchema = z
  .object({
    subject: requiredText(200).refine(
      (value) => !/[\r\n]/.test(value),
      "validation.subjectLineBreaks",
    ),
    body: optionalBody(MAX_MESSAGE_TEXT_LENGTH).refine(
      (value) => value === null || findUnsupportedMergeFields(value).length === 0,
      "validation.unsupportedMergeField",
    ),
    bodyHtml: optionalBody(MAX_MESSAGE_HTML_LENGTH),
    ...audienceFields,
  })
  .refine((value) => Boolean(value.body) || Boolean(value.bodyHtml), {
    message: "validation.bodyRequired",
    path: ["body"],
  })
  .refine((value) => !(value.body && value.bodyHtml), {
    message: "validation.bodySource",
    path: ["body"],
  })
  .refine((value) => Boolean(value.groupId) !== Boolean(value.segmentId), {
    message: "validation.audienceSource",
    path: ["groupId"],
  });

export type MessageInput = z.infer<typeof messageSchema>;

export const messageGroupMemberSchema = z.object({
  contactId: uuidSchema,
});

export const messageListParamsSchema = z.object({
  q: z.string().trim().max(200, "validation.maxLength").optional().default(""),
  status: z.enum(["draft", "sending", "completed", "cancelled"]).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: pageSizeSchema,
});

export function unsupportedMergeFieldsDescriptor(body: string): MessageDescriptor | null {
  const fields = findUnsupportedMergeFields(body);
  if (fields.length === 0) return null;
  return {
    key: "validation.unsupportedMergeField",
    params: { fields: fields.join(", ") },
  };
}
