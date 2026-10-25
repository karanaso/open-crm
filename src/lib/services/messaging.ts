import { and, asc, count, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import {
  companies,
  contacts,
  messageGroupMembers,
  messageGroups,
  messageRecipients,
  messages,
  segments,
  users,
  type Message,
  type MessageGroup,
  type MessageRecipient,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import { renderMergeFields } from "@/lib/messaging/render";
import {
  getMaxRecipients,
  getTransport,
  isFakeTransport,
  isMessagingConfigured,
  mapTransportError,
  shouldAbortRun,
  type EmailTransport,
} from "@/lib/messaging/transport";
import { segmentWhere } from "@/lib/services/marketing";
import type { MessageAudienceSnapshot } from "@/lib/types";
import type {
  MessageGroupInput,
  MessageInput,
  messageListParamsSchema,
} from "@/lib/validation/messaging";

type MessageListParams = z.infer<typeof messageListParamsSchema>;

type AudienceContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string | null;
  archivedAt: Date | null;
  emailOptOutAt: Date | null;
};

type ClassifiedRecipient = {
  contactId: string;
  address: string;
  status: "queued" | "skipped";
  reason: "opted_out" | "archived" | "missing_email" | null;
};

const INSERT_CHUNK_SIZE = 500;
const MESSAGE_HISTORY_LIMIT = 10;

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function listMessageGroups(includeArchived = false) {
  const rows = await db
    .select({
      group: messageGroups,
      creatorName: users.name,
      memberCount: sql<number>`(select count(*)::int from message_group_members m where m.group_id = ${messageGroups.id})`,
    })
    .from(messageGroups)
    .innerJoin(users, eq(messageGroups.createdById, users.id))
    .where(includeArchived ? undefined : isNull(messageGroups.archivedAt))
    .orderBy(desc(messageGroups.updatedAt));

  return rows.map((row) => ({
    ...row.group,
    creatorName: row.creatorName,
    memberCount: Number(row.memberCount ?? 0),
  }));
}

export async function getMessageGroupOptions() {
  const rows = await db
    .select({
      group: messageGroups,
      memberCount: sql<number>`(select count(*)::int from message_group_members m where m.group_id = ${messageGroups.id})`,
    })
    .from(messageGroups)
    .where(isNull(messageGroups.archivedAt))
    .orderBy(asc(messageGroups.name));

  return rows.map((row) => ({
    ...row.group,
    memberCount: Number(row.memberCount ?? 0),
  }));
}

export async function getMessageGroup(groupId: string) {
  const [row] = await db
    .select({ group: messageGroups, creatorName: users.name })
    .from(messageGroups)
    .innerJoin(users, eq(messageGroups.createdById, users.id))
    .where(eq(messageGroups.id, groupId))
    .limit(1);
  if (!row) return null;

  const members = await db
    .select({
      contact: contacts,
      companyName: companies.name,
      addedByName: users.name,
    })
    .from(messageGroupMembers)
    .innerJoin(contacts, eq(messageGroupMembers.contactId, contacts.id))
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .leftJoin(users, eq(messageGroupMembers.addedById, users.id))
    .where(eq(messageGroupMembers.groupId, groupId))
    .orderBy(asc(contacts.firstName), asc(contacts.lastName));

  return {
    ...row.group,
    creatorName: row.creatorName,
    members: members.map((member) => ({
      ...member.contact,
      companyName: member.companyName,
      addedByName: member.addedByName,
    })),
  };
}

async function requireGroup(groupId: string): Promise<MessageGroup> {
  const [group] = await db
    .select()
    .from(messageGroups)
    .where(eq(messageGroups.id, groupId))
    .limit(1);
  if (!group) throw new AppError("Recipient group not found", "NOT_FOUND");
  return group;
}

function requireEditableGroup(group: MessageGroup) {
  if (group.archivedAt) {
    throw new AppError("Archived recipient groups are read-only.", "ARCHIVED_MESSAGE_GROUP");
  }
}

export async function createMessageGroup(input: MessageGroupInput, actorId: string) {
  const [group] = await db
    .insert(messageGroups)
    .values({
      name: input.name,
      description: input.description,
      createdById: actorId,
    })
    .returning();
  return group;
}

export async function updateMessageGroup(groupId: string, input: MessageGroupInput) {
  requireEditableGroup(await requireGroup(groupId));
  const [group] = await db
    .update(messageGroups)
    .set({ name: input.name, description: input.description, updatedAt: new Date() })
    .where(eq(messageGroups.id, groupId))
    .returning();
  return group;
}

export async function setMessageGroupArchived(groupId: string, archived: boolean) {
  const [group] = await db
    .update(messageGroups)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(messageGroups.id, groupId))
    .returning();
  if (!group) throw new AppError("Recipient group not found", "NOT_FOUND");
  return group;
}

export async function addMessageGroupMember(
  groupId: string,
  contactId: string,
  actorId: string,
) {
  requireEditableGroup(await requireGroup(groupId));

  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact) throw new AppError("Contact not found", "NOT_FOUND");
  if (contact.archivedAt) {
    throw new AppError("Choose an active contact.", "ARCHIVED_CONTACT");
  }

  await db
    .insert(messageGroupMembers)
    .values({ groupId, contactId, addedById: actorId })
    .onConflictDoNothing();
}

export async function removeMessageGroupMember(groupId: string, contactId: string) {
  requireEditableGroup(await requireGroup(groupId));
  await db
    .delete(messageGroupMembers)
    .where(and(eq(messageGroupMembers.groupId, groupId), eq(messageGroupMembers.contactId, contactId)));
}

async function groupAudience(groupId: string): Promise<AudienceContact[]> {
  return db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      companyName: companies.name,
      archivedAt: contacts.archivedAt,
      emailOptOutAt: contacts.emailOptOutAt,
    })
    .from(messageGroupMembers)
    .innerJoin(contacts, eq(messageGroupMembers.contactId, contacts.id))
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(eq(messageGroupMembers.groupId, groupId))
    .orderBy(asc(contacts.firstName), asc(contacts.lastName))
    .limit(5000);
}

async function segmentAudience(criteria: Parameters<typeof segmentWhere>[0]): Promise<AudienceContact[]> {
  return db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      companyName: companies.name,
      archivedAt: contacts.archivedAt,
      emailOptOutAt: contacts.emailOptOutAt,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(segmentWhere(criteria))
    .orderBy(asc(contacts.firstName), asc(contacts.lastName))
    .limit(5000);
}

async function resolveMessageAudience(message: Message) {
  if (message.groupId) {
    const group = await requireGroup(message.groupId);
    return {
      kind: "group" as const,
      name: group.name,
      criteria: undefined,
      contacts: await groupAudience(group.id),
    };
  }

  if (!message.segmentId) {
    throw new AppError("Message audience is missing.", "BAD_REQUEST");
  }

  const [segment] = await db
    .select()
    .from(segments)
    .where(eq(segments.id, message.segmentId))
    .limit(1);
  if (!segment) throw new AppError("Segment not found", "NOT_FOUND");

  return {
    kind: "segment" as const,
    name: segment.name,
    criteria: segment.criteria,
    contacts: await segmentAudience(segment.criteria),
  };
}

function classifyAudience(rows: AudienceContact[]): ClassifiedRecipient[] {
  return rows.map((contact) => {
    if (contact.archivedAt) {
      return {
        contactId: contact.id,
        address: contact.email,
        status: "skipped" as const,
        reason: "archived" as const,
      };
    }
    if (!contact.email.trim()) {
      return {
        contactId: contact.id,
        address: contact.email,
        status: "skipped" as const,
        reason: "missing_email" as const,
      };
    }
    if (contact.emailOptOutAt) {
      return {
        contactId: contact.id,
        address: contact.email,
        status: "skipped" as const,
        reason: "opted_out" as const,
      };
    }
    return {
      contactId: contact.id,
      address: contact.email,
      status: "queued" as const,
      reason: null,
    };
  });
}

export async function previewMessageAudience(messageId: string) {
  const [message] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!message) throw new AppError("Message not found", "NOT_FOUND");

  const audience = await resolveMessageAudience(message);
  const classified = classifyAudience(audience.contacts);

  return {
    kind: audience.kind,
    name: audience.name,
    total: classified.length,
    eligible: classified.filter((recipient) => recipient.status === "queued").length,
    skipped: {
      archived: classified.filter((recipient) => recipient.reason === "archived").length,
      missingEmail: classified.filter((recipient) => recipient.reason === "missing_email").length,
      optedOut: classified.filter((recipient) => recipient.reason === "opted_out").length,
    },
  };
}

async function validateAudienceSource(input: MessageInput, existing?: Message) {
  if (input.groupId) {
    const group = await requireGroup(input.groupId);
    if (group.archivedAt && existing?.groupId !== group.id) {
      throw new AppError("Archived recipient groups are read-only.", "ARCHIVED_MESSAGE_GROUP");
    }
    return;
  }

  if (!input.segmentId) {
    throw new AppError("Choose a recipient group or segment.", "BAD_REQUEST");
  }

  const [segment] = await db
    .select()
    .from(segments)
    .where(eq(segments.id, input.segmentId))
    .limit(1);
  if (!segment) throw new AppError("Segment not found", "NOT_FOUND");
  if (segment.archivedAt && existing?.segmentId !== segment.id) {
    throw new AppError("Choose an active segment.", "ARCHIVED_SEGMENT");
  }
}

export async function createMessage(input: MessageInput, actorId: string) {
  await validateAudienceSource(input);

  const [message] = await db
    .insert(messages)
    .values({
      subject: input.subject,
      body: input.body,
      groupId: input.groupId,
      segmentId: input.segmentId,
      createdById: actorId,
    })
    .returning();
  return message;
}

export async function updateMessage(messageId: string, input: MessageInput) {
  const [existing] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  if (!existing) throw new AppError("Message not found", "NOT_FOUND");
  if (existing.status !== "draft") {
    throw new AppError("Only draft messages can be edited.", "INVALID_MESSAGE_STATE");
  }

  await validateAudienceSource(input, existing);

  const [message] = await db
    .update(messages)
    .set({
      subject: input.subject,
      body: input.body,
      groupId: input.groupId,
      segmentId: input.segmentId,
      updatedAt: new Date(),
    })
    .where(and(eq(messages.id, messageId), eq(messages.status, "draft")))
    .returning();
  if (!message) {
    throw new AppError("Only draft messages can be edited.", "INVALID_MESSAGE_STATE");
  }
  return message;
}

export async function listMessages(params: MessageListParams) {
  const conditions = [];
  if (params.q) conditions.push(ilike(messages.subject, `%${params.q}%`));
  if (params.status) conditions.push(eq(messages.status, params.status));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        message: messages,
        groupName: messageGroups.name,
        segmentName: segments.name,
        total: sql<number>`(select count(*)::int from message_recipients r where r.message_id = ${messages.id})`,
        sent: sql<number>`(select count(*)::int from message_recipients r where r.message_id = ${messages.id} and r.status = 'sent')`,
        failed: sql<number>`(select count(*)::int from message_recipients r where r.message_id = ${messages.id} and r.status = 'failed')`,
        skipped: sql<number>`(select count(*)::int from message_recipients r where r.message_id = ${messages.id} and r.status = 'skipped')`,
      })
      .from(messages)
      .leftJoin(messageGroups, eq(messages.groupId, messageGroups.id))
      .leftJoin(segments, eq(messages.segmentId, segments.id))
      .where(where)
      .orderBy(desc(messages.createdAt))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ count: count() }).from(messages).where(where),
  ]);

  const total = Number(totalRow[0]?.count ?? 0);
  return {
    items: rows.map((row) => ({
      ...row.message,
      audienceName:
        row.message.audienceSnapshot?.name ?? row.groupName ?? row.segmentName ?? "",
      counts: {
        total: Number(row.total ?? 0),
        sent: Number(row.sent ?? 0),
        failed: Number(row.failed ?? 0),
        skipped: Number(row.skipped ?? 0),
      },
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getMessageRecipients(messageId: string) {
  return db
    .select({
      recipient: messageRecipients,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      companyName: companies.name,
    })
    .from(messageRecipients)
    .innerJoin(contacts, eq(messageRecipients.contactId, contacts.id))
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(eq(messageRecipients.messageId, messageId))
    .orderBy(asc(contacts.firstName), asc(contacts.lastName));
}

function countRecipients(
  rows: Awaited<ReturnType<typeof getMessageRecipients>>,
) {
  const counts = { total: rows.length, queued: 0, sent: 0, failed: 0, skipped: 0 };
  for (const row of rows) counts[row.recipient.status] += 1;
  return counts;
}

export async function getMessage(messageId: string) {
  const [row] = await db
    .select({
      message: messages,
      groupName: messageGroups.name,
      segmentName: segments.name,
      creatorName: users.name,
    })
    .from(messages)
    .leftJoin(messageGroups, eq(messages.groupId, messageGroups.id))
    .leftJoin(segments, eq(messages.segmentId, segments.id))
    .innerJoin(users, eq(messages.createdById, users.id))
    .where(eq(messages.id, messageId))
    .limit(1);
  if (!row) return null;

  const recipients = await getMessageRecipients(messageId);

  return {
    ...row.message,
    creatorName: row.creatorName,
    audienceName:
      row.message.audienceSnapshot?.name ?? row.groupName ?? row.segmentName ?? "",
    recipients,
    counts: countRecipients(recipients),
  };
}

async function requireMessage(messageId: string): Promise<Message> {
  const [message] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!message) throw new AppError("Message not found", "NOT_FOUND");
  return message;
}

async function replyToAddress(actorId: string): Promise<string> {
  const [actor] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1);
  if (!actor) throw new AppError("User not found", "NOT_FOUND");
  return actor.email;
}

type DeliveryStatus = "queued" | "failed";

const RUN_STALE_MS = 30 * 60 * 1000;

function ineligibleReason(row: {
  archivedAt: Date | null;
  emailOptOutAt: Date | null;
  recipient: { address: string };
}): "archived" | "missing_email" | "opted_out" | null {
  if (row.archivedAt) return "archived";
  if (!row.recipient.address.trim()) return "missing_email";
  if (row.emailOptOutAt) return "opted_out";
  return null;
}

async function updateRecipientOutcome(
  recipientId: string,
  statuses: DeliveryStatus[],
  values: {
    status: "sent" | "failed" | "skipped";
    reason: MessageRecipient["reason"];
    providerMessageId?: string | null;
  },
) {
  await db
    .update(messageRecipients)
    .set({
      status: values.status,
      reason: values.reason,
      providerMessageId: values.providerMessageId ?? null,
      attemptedAt: new Date(),
    })
    .where(
      and(eq(messageRecipients.id, recipientId), inArray(messageRecipients.status, statuses)),
    );
}

async function deliverRecipients(
  message: Message,
  replyTo: string,
  statuses: DeliveryStatus[],
  transport: EmailTransport,
) {
  const pending = await db
    .select({
      recipient: messageRecipients,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      companyName: companies.name,
      archivedAt: contacts.archivedAt,
      emailOptOutAt: contacts.emailOptOutAt,
    })
    .from(messageRecipients)
    .innerJoin(contacts, eq(messageRecipients.contactId, contacts.id))
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(
      and(
        eq(messageRecipients.messageId, message.id),
        inArray(messageRecipients.status, statuses),
      ),
    )
    .orderBy(asc(messageRecipients.createdAt), asc(messageRecipients.id));

  for (const row of pending) {
    const [current] = await db
      .select({ status: messages.status })
      .from(messages)
      .where(eq(messages.id, message.id))
      .limit(1);
    if (!current || current.status === "cancelled") break;

    const reason = ineligibleReason(row);
    if (reason) {
      await updateRecipientOutcome(row.recipient.id, statuses, {
        status: "skipped",
        reason,
      });
      continue;
    }

    try {
      const result = await transport.send({
        to: row.recipient.address,
        replyTo,
        subject: message.subject,
        text: renderMergeFields(message.body, {
          firstName: row.firstName,
          lastName: row.lastName,
          company: row.companyName,
        }),
      });
      await updateRecipientOutcome(row.recipient.id, statuses, {
        status: "sent",
        reason: null,
        providerMessageId: result.providerMessageId ?? null,
      });
    } catch (error) {
      const failure = mapTransportError(error);
      await updateRecipientOutcome(row.recipient.id, statuses, {
        status: "failed",
        reason: failure,
      });
      if (shouldAbortRun(failure)) break;
    }
  }
}

async function finalizeMessage(messageId: string) {
  const [pending] = await db
    .select({ count: count() })
    .from(messageRecipients)
    .where(
      and(eq(messageRecipients.messageId, messageId), eq(messageRecipients.status, "queued")),
    );

  if (Number(pending?.count ?? 0) === 0) {
    const [completed] = await db
      .update(messages)
      .set({
        status: "completed",
        completedAt: new Date(),
        runStartedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(messages.id, messageId), eq(messages.status, "sending")))
      .returning();
    if (completed) return completed;
  }

  return requireMessage(messageId);
}

async function releaseRun(messageId: string, claimedAt: Date | null) {
  if (!claimedAt) return;
  await db
    .update(messages)
    .set({ runStartedAt: null })
    .where(and(eq(messages.id, messageId), eq(messages.runStartedAt, claimedAt)));
}

function requireTransportConfigured() {
  if (!isFakeTransport() && !isMessagingConfigured()) {
    throw new AppError("Email delivery is not configured.", "MESSAGING_NOT_CONFIGURED");
  }
}

export async function sendMessage(
  messageId: string,
  actorId: string,
  transport?: EmailTransport,
) {
  requireTransportConfigured();
  const runTransport = transport ?? (await getTransport());
  const replyTo = await replyToAddress(actorId);
  const cap = getMaxRecipients();
  let claimedAt: Date | null = null;

  try {
    const message = await requireMessage(messageId);
    if (message.status !== "draft") {
      throw new AppError("Only draft messages can be sent.", "INVALID_MESSAGE_STATE");
    }

    const audience = await resolveMessageAudience(message);
    const classified = classifyAudience(audience.contacts);
    const eligible = classified.filter((recipient) => recipient.status === "queued");

    if (eligible.length === 0) {
      throw new AppError("This audience has no eligible recipients.", "NO_ELIGIBLE_RECIPIENTS");
    }
    if (eligible.length > cap) {
      throw new AppError("This message exceeds the recipient limit.", "RECIPIENT_LIMIT_EXCEEDED", {
        limit: cap,
      });
    }

    const snapshot: MessageAudienceSnapshot = {
      kind: audience.kind,
      name: audience.name,
      ...(audience.criteria ? { criteria: audience.criteria } : {}),
    };

    const frozen = await db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1)
        .for("update");
      if (!locked) throw new AppError("Message not found", "NOT_FOUND");
      if (locked.status !== "draft") {
        throw new AppError("Only draft messages can be sent.", "INVALID_MESSAGE_STATE");
      }

      const [updated] = await tx
        .update(messages)
        .set({
          status: "sending",
          audienceSnapshot: snapshot,
          sentAt: new Date(),
          runStartedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(messages.id, messageId))
        .returning();

      for (const chunk of chunkItems(classified, INSERT_CHUNK_SIZE)) {
        await tx
          .insert(messageRecipients)
          .values(
            chunk.map((recipient) => ({
              messageId,
              contactId: recipient.contactId,
              address: recipient.address,
              status: recipient.status,
              reason: recipient.reason,
            })),
          )
          .onConflictDoNothing();
      }

      return updated;
    });

    claimedAt = frozen.runStartedAt;
    await deliverRecipients(frozen, replyTo, ["queued"], runTransport);
    return await finalizeMessage(messageId);
  } finally {
    runTransport.close?.();
    await releaseRun(messageId, claimedAt);
  }
}

export async function retryMessage(
  messageId: string,
  actorId: string,
  transport?: EmailTransport,
) {
  requireTransportConfigured();
  const runTransport = transport ?? (await getTransport());
  const replyTo = await replyToAddress(actorId);
  const runStartedAt = new Date();
  const staleBefore = new Date(runStartedAt.getTime() - RUN_STALE_MS);
  let claimedAt: Date | null = null;

  try {
    const claimed = await db.transaction(async (tx) => {
      const [message] = await tx
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1)
        .for("update");
      if (!message) throw new AppError("Message not found", "NOT_FOUND");
      if (message.status !== "sending" && message.status !== "completed") {
        throw new AppError("This message cannot be retried.", "INVALID_MESSAGE_STATE");
      }
      if (message.runStartedAt && message.runStartedAt > staleBefore) {
        throw new AppError("A send is already in progress.", "SEND_IN_PROGRESS");
      }

      const [pending] = await tx
        .select({ count: count() })
        .from(messageRecipients)
        .where(
          and(
            eq(messageRecipients.messageId, messageId),
            inArray(messageRecipients.status, ["queued", "failed"]),
          ),
        );
      if (Number(pending?.count ?? 0) === 0) {
        throw new AppError("This message has no recipients to retry.", "INVALID_MESSAGE_STATE");
      }

      const [updated] = await tx
        .update(messages)
        .set({
          status: "sending",
          completedAt: null,
          runStartedAt,
          updatedAt: runStartedAt,
        })
        .where(eq(messages.id, messageId))
        .returning();
      return updated;
    });

    claimedAt = claimed.runStartedAt;
    await deliverRecipients(claimed, replyTo, ["queued", "failed"], runTransport);
    return await finalizeMessage(messageId);
  } finally {
    runTransport.close?.();
    await releaseRun(messageId, claimedAt);
  }
}

export async function cancelMessage(messageId: string) {
  return db.transaction(async (tx) => {
    const [message] = await tx
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1)
      .for("update");
    if (!message) throw new AppError("Message not found", "NOT_FOUND");
    if (message.status !== "sending") {
      throw new AppError("Only a sending message can be cancelled.", "INVALID_MESSAGE_STATE");
    }

    await tx
      .update(messageRecipients)
      .set({ status: "skipped", reason: "cancelled", attemptedAt: new Date() })
      .where(
        and(
          eq(messageRecipients.messageId, messageId),
          eq(messageRecipients.status, "queued"),
        ),
      );

    const [cancelled] = await tx
      .update(messages)
      .set({ status: "cancelled", runStartedAt: null, updatedAt: new Date() })
      .where(eq(messages.id, messageId))
      .returning();
    return cancelled;
  });
}

export async function setContactEmailOptOut(contactId: string, optOut: boolean) {
  const [contact] = await db
    .update(contacts)
    .set({ emailOptOutAt: optOut ? new Date() : null, updatedAt: new Date() })
    .where(eq(contacts.id, contactId))
    .returning();
  if (!contact) throw new AppError("Contact not found", "NOT_FOUND");
  return contact;
}

export async function getContactMessageHistory(
  contactId: string,
  limit = MESSAGE_HISTORY_LIMIT,
) {
  return db
    .select({
      messageId: messages.id,
      subject: messages.subject,
      messageStatus: messages.status,
      sentAt: messages.sentAt,
      createdAt: messages.createdAt,
      status: messageRecipients.status,
      reason: messageRecipients.reason,
    })
    .from(messageRecipients)
    .innerJoin(messages, eq(messageRecipients.messageId, messages.id))
    .where(eq(messageRecipients.contactId, contactId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
}
