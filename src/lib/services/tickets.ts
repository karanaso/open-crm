import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import {
  companies,
  contacts,
  ticketComments,
  tickets,
  users,
  type Ticket,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import { canTransitionTicket } from "@/lib/ticket-status";
import { getTicketSla } from "@/lib/sla";
import type { commentSchema, ticketListParamsSchema } from "@/lib/validation/ticket";
import type { TicketInput } from "@/lib/validation/ticket";

type TicketListParams = z.infer<typeof ticketListParamsSchema>;
type CommentInput = z.infer<typeof commentSchema>;

const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3 } as const;

export async function getTicket(ticketId: string) {
  const [row] = await db
    .select({
      ticket: tickets,
      requesterFirstName: contacts.firstName,
      requesterLastName: contacts.lastName,
      requesterEmail: contacts.email,
      companyId: companies.id,
      companyName: companies.name,
      companyArchivedAt: companies.archivedAt,
      assigneeName: users.name,
      assigneeStatus: users.status,
    })
    .from(tickets)
    .innerJoin(contacts, eq(tickets.requesterContactId, contacts.id))
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .leftJoin(users, eq(tickets.assigneeId, users.id))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!row) return null;

  return {
    ...row.ticket,
    requesterName: `${row.requesterFirstName} ${row.requesterLastName}`,
    requesterEmail: row.requesterEmail,
    companyId: row.companyId,
    companyName: row.companyName,
    companyArchivedAt: row.companyArchivedAt,
    assigneeName: row.assigneeName,
    assigneeStatus: row.assigneeStatus,
    sla: getTicketSla(row.ticket),
  };
}

export async function listTickets(params: TicketListParams) {
  const conditions = [];
  if (params.status === "active") {
    conditions.push(sql`${tickets.status} in ('open', 'in_progress', 'pending')`);
  } else if (params.status) {
    conditions.push(eq(tickets.status, params.status));
  }
  if (params.priority) conditions.push(eq(tickets.priority, params.priority));
  if (params.assigneeId) conditions.push(eq(tickets.assigneeId, params.assigneeId));
  if (params.unassigned) conditions.push(sql`${tickets.assigneeId} is null`);
  if (params.requesterId) conditions.push(eq(tickets.requesterContactId, params.requesterId));
  if (params.companyId) conditions.push(eq(contacts.companyId, params.companyId));
  if (params.q) {
    const pattern = `%${params.q}%`;
    conditions.push(
      or(
        ilike(tickets.subject, pattern),
        ilike(contacts.firstName, pattern),
        ilike(contacts.lastName, pattern),
        ilike(contacts.email, pattern),
      ),
    );
  }

  const rows = await db
    .select({
      ticket: tickets,
      requesterFirstName: contacts.firstName,
      requesterLastName: contacts.lastName,
      requesterEmail: contacts.email,
      companyId: companies.id,
      companyName: companies.name,
      assigneeName: users.name,
      assigneeStatus: users.status,
    })
    .from(tickets)
    .innerJoin(contacts, eq(tickets.requesterContactId, contacts.id))
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .leftJoin(users, eq(tickets.assigneeId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(tickets.updatedAt))
    .limit(1000);

  let items = rows.map((row) => {
    const sla = getTicketSla(row.ticket);
    return {
      ...row.ticket,
      requesterName: `${row.requesterFirstName} ${row.requesterLastName}`,
      requesterEmail: row.requesterEmail,
      companyId: row.companyId,
      companyName: row.companyName,
      assigneeName: row.assigneeName,
      assigneeStatus: row.assigneeStatus,
      sla,
    };
  });

  if (params.overdue) items = items.filter((ticket) => ticket.sla.isOverdue);

  if (params.sort === "created") {
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else if (params.sort === "priority") {
    items.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  } else if (params.sort === "sla") {
    items.sort((a, b) => a.sla.firstResponseDue.getTime() - b.sla.firstResponseDue.getTime());
  } else {
    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  const total = items.length;
  const offset = (params.page - 1) * params.pageSize;

  return {
    items: items.slice(offset, offset + params.pageSize),
    total,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

async function assertAssignee(assigneeId: string | null | undefined, currentAssigneeId?: string | null) {
  if (!assigneeId) return;
  const [user] = await db.select().from(users).where(eq(users.id, assigneeId)).limit(1);
  if (!user) throw new AppError("Assignee not found", "NOT_FOUND");
  if (user.status !== "active" && assigneeId !== currentAssigneeId) {
    throw new AppError("Choose an active team member as assignee", "INACTIVE_ASSIGNEE");
  }
}

export async function createTicket(input: TicketInput, actorId: string) {
  await assertAssignee(input.assigneeId);
  const [requester] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, input.requesterContactId))
    .limit(1);
  if (!requester) throw new AppError("Requester not found", "NOT_FOUND");

  const [ticket] = await db
    .insert(tickets)
    .values({
      subject: input.subject,
      description: input.description,
      requesterContactId: input.requesterContactId,
      priority: input.priority,
      assigneeId: input.assigneeId,
      status: "open",
      createdById: actorId,
      updatedAt: new Date(),
    })
    .returning();
  return ticket;
}

export async function updateTicket(
  ticketId: string,
  input: TicketInput,
  expectedUpdatedAt?: string,
) {
  const existing = await getTicket(ticketId);
  if (!existing) throw new AppError("Ticket not found", "NOT_FOUND");
  await assertAssignee(input.assigneeId, existing.assigneeId);

  const where = expectedUpdatedAt
    ? and(
        eq(tickets.id, ticketId),
        sql`date_trunc('milliseconds', ${tickets.updatedAt}) = ${new Date(expectedUpdatedAt).toISOString()}::timestamptz`,
      )
    : eq(tickets.id, ticketId);

  const [ticket] = await db
    .update(tickets)
    .set({
      subject: input.subject,
      description: input.description,
      requesterContactId: input.requesterContactId,
      priority: input.priority,
      assigneeId: input.assigneeId,
      updatedAt: new Date(),
    })
    .where(where)
    .returning();

  if (!ticket) throw new AppError("This ticket changed since you loaded it. Refresh and try again.", "CONFLICT");
  return ticket;
}

export async function changeTicketStatus(ticketId: string, status: Ticket["status"]) {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  if (!ticket) throw new AppError("Ticket not found", "NOT_FOUND");
  if (!canTransitionTicket(ticket.status, status)) {
    throw new AppError(`A ${ticket.status.replaceAll("_", " ")} ticket cannot move to ${status.replaceAll("_", " ")}.`, "INVALID_TRANSITION");
  }

  const now = new Date();
  const reopening = status === "open";
  const [updated] = await db
    .update(tickets)
    .set({
      status,
      resolvedAt: status === "resolved" ? ticket.resolvedAt ?? now : reopening ? null : ticket.resolvedAt,
      closedAt: status === "closed" ? ticket.closedAt ?? now : reopening ? null : ticket.closedAt,
      updatedAt: now,
    })
    .where(eq(tickets.id, ticketId))
    .returning();

  return updated;
}

export async function assignTicket(ticketId: string, assigneeId: string | null) {
  const existing = await getTicket(ticketId);
  if (!existing) throw new AppError("Ticket not found", "NOT_FOUND");
  await assertAssignee(assigneeId, null);
  const [ticket] = await db
    .update(tickets)
    .set({ assigneeId, updatedAt: new Date() })
    .where(eq(tickets.id, ticketId))
    .returning();
  return ticket;
}

export async function changeTicketPriority(ticketId: string, priority: Ticket["priority"]) {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  if (!ticket) throw new AppError("Ticket not found", "NOT_FOUND");
  const [updated] = await db
    .update(tickets)
    .set({ priority, updatedAt: new Date() })
    .where(eq(tickets.id, ticketId))
    .returning();
  return updated;
}

export async function getTicketComments(
  ticketId: string,
  viewer: { id: string; role: "admin" | "member" },
) {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  if (!ticket) throw new AppError("Ticket not found", "NOT_FOUND");

  const canSeeInternal = viewer.role === "admin" || ticket.assigneeId === viewer.id;
  const rows = await db
    .select({ comment: ticketComments, authorName: users.name })
    .from(ticketComments)
    .innerJoin(users, eq(ticketComments.authorId, users.id))
    .where(
      canSeeInternal
        ? eq(ticketComments.ticketId, ticketId)
        : and(eq(ticketComments.ticketId, ticketId), eq(ticketComments.visibility, "reply")),
    )
    .orderBy(asc(ticketComments.createdAt));

  return rows.map((row) => ({ ...row.comment, authorName: row.authorName }));
}

export async function addTicketComment(
  ticketId: string,
  input: CommentInput,
  author: { id: string; role: "admin" | "member" },
) {
  const body = input.body.trim();
  if (!body) throw new AppError("Write a comment before posting.", "EMPTY_COMMENT");

  return db.transaction(async (tx) => {
    const [ticket] = await tx.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1).for("update");
    if (!ticket) throw new AppError("Ticket not found", "NOT_FOUND");

    const [comment] = await tx
      .insert(ticketComments)
      .values({
        ticketId,
        authorId: author.id,
        body,
        visibility: input.visibility,
      })
      .returning();

    if (input.visibility === "reply" && !ticket.firstResponseAt) {
      await tx
        .update(tickets)
        .set({ firstResponseAt: comment.createdAt, updatedAt: new Date() })
        .where(eq(tickets.id, ticketId));
    }

    return comment;
  });
}

export async function getTicketsForContact(contactId: string) {
  return db
    .select()
    .from(tickets)
    .where(eq(tickets.requesterContactId, contactId))
    .orderBy(desc(tickets.updatedAt))
    .limit(50);
}

export const ticketServiceInternals = { count, sql };
