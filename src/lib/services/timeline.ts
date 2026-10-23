import type { Route } from "next";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  campaigns,
  companies,
  contacts,
  deals,
  tasks,
  tickets,
  users,
  type Activity,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import { sortByOccurredAtDesc } from "@/lib/timeline-sort";
import type { ActivityInput } from "@/lib/validation/engagement";

export type RecordLinks = {
  companyId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  ticketId?: string | null;
  campaignId?: string | null;
};

export type TimelineLink = {
  type: "company" | "contact" | "deal" | "ticket" | "campaign";
  id: string;
  label: string;
  href: Route;
};

export type TimelineItem = {
  id: string;
  kind: "activity" | "task";
  type: string;
  subject: string;
  body: string | null;
  occurredAt: Date;
  authorName: string;
  authorId?: string;
  links: TimelineLink[];
  linkIds: RecordLinks;
  metadata?: Activity["metadata"];
};

export function recordLinkCondition(
  table:
    | typeof activities.companyId
    | typeof activities.contactId
    | typeof activities.dealId
    | typeof activities.ticketId
    | typeof activities.campaignId,
  id: string,
) {
  return eq(table, id);
}

export async function loadLinkLabels(rows: RecordLinks[]) {
  const companyIds = [...new Set(rows.map((row) => row.companyId).filter(Boolean))] as string[];
  const contactIds = [...new Set(rows.map((row) => row.contactId).filter(Boolean))] as string[];
  const dealIds = [...new Set(rows.map((row) => row.dealId).filter(Boolean))] as string[];
  const ticketIds = [...new Set(rows.map((row) => row.ticketId).filter(Boolean))] as string[];
  const campaignIds = [...new Set(rows.map((row) => row.campaignId).filter(Boolean))] as string[];

  const [companyRows, contactRows, dealRows, ticketRows, campaignRows] = await Promise.all([
    companyIds.length
      ? db.select({ id: companies.id, name: companies.name }).from(companies).where(inArray(companies.id, companyIds))
      : Promise.resolve([]),
    contactIds.length
      ? db
          .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName })
          .from(contacts)
          .where(inArray(contacts.id, contactIds))
      : Promise.resolve([]),
    dealIds.length
      ? db.select({ id: deals.id, name: deals.name }).from(deals).where(inArray(deals.id, dealIds))
      : Promise.resolve([]),
    ticketIds.length
      ? db.select({ id: tickets.id, subject: tickets.subject }).from(tickets).where(inArray(tickets.id, ticketIds))
      : Promise.resolve([]),
    campaignIds.length
      ? db.select({ id: campaigns.id, name: campaigns.name }).from(campaigns).where(inArray(campaigns.id, campaignIds))
      : Promise.resolve([]),
  ]);

  const maps = {
    company: new Map(companyRows.map((row) => [row.id, row.name])),
    contact: new Map(contactRows.map((row) => [row.id, `${row.firstName} ${row.lastName}`])),
    deal: new Map(dealRows.map((row) => [row.id, row.name])),
    ticket: new Map(ticketRows.map((row) => [row.id, row.subject])),
    campaign: new Map(campaignRows.map((row) => [row.id, row.name])),
  };

  return rows.map((row): TimelineLink[] => {
    const links: TimelineLink[] = [];
    if (row.companyId) {
      links.push({
        type: "company",
        id: row.companyId,
        label: maps.company.get(row.companyId) ?? "Company",
        href: `/companies/${row.companyId}` as Route,
      });
    }
    if (row.contactId) {
      links.push({
        type: "contact",
        id: row.contactId,
        label: maps.contact.get(row.contactId) ?? "Contact",
        href: `/contacts/${row.contactId}` as Route,
      });
    }
    if (row.dealId) {
      links.push({
        type: "deal",
        id: row.dealId,
        label: maps.deal.get(row.dealId) ?? "Deal",
        href: `/deals/${row.dealId}` as Route,
      });
    }
    if (row.ticketId) {
      links.push({
        type: "ticket",
        id: row.ticketId,
        label: maps.ticket.get(row.ticketId) ?? "Ticket",
        href: `/tickets/${row.ticketId}` as Route,
      });
    }
    if (row.campaignId) {
      links.push({
        type: "campaign",
        id: row.campaignId,
        label: maps.campaign.get(row.campaignId) ?? "Campaign",
        href: `/campaigns/${row.campaignId}` as Route,
      });
    }
    return links;
  });
}

function linkWhere(link: RecordLinks) {
  const conditions = [];
  if (link.companyId) conditions.push(eq(activities.companyId, link.companyId));
  if (link.contactId) conditions.push(eq(activities.contactId, link.contactId));
  if (link.dealId) conditions.push(eq(activities.dealId, link.dealId));
  if (link.ticketId) conditions.push(eq(activities.ticketId, link.ticketId));
  if (link.campaignId) conditions.push(eq(activities.campaignId, link.campaignId));
  return and(...conditions);
}

function taskLinkWhere(link: RecordLinks) {
  const conditions = [];
  if (link.companyId) conditions.push(eq(tasks.companyId, link.companyId));
  if (link.contactId) conditions.push(eq(tasks.contactId, link.contactId));
  if (link.dealId) conditions.push(eq(tasks.dealId, link.dealId));
  if (link.ticketId) conditions.push(eq(tasks.ticketId, link.ticketId));
  if (link.campaignId) conditions.push(eq(tasks.campaignId, link.campaignId));
  return and(...conditions);
}

export async function getTimeline(
  link: RecordLinks,
  options: { type?: string; page?: number; pageSize?: number } = {},
) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;

  const activityConditions = [linkWhere(link)];
  const allowedTypes = ["note", "call", "email", "meeting", "stage_change"];
  if (options.type && allowedTypes.includes(options.type)) {
    activityConditions.push(eq(activities.type, options.type as Activity["type"]));
  }

  const activityRows = await db
    .select({ activity: activities, authorName: users.name })
    .from(activities)
    .innerJoin(users, eq(activities.authorId, users.id))
    .where(and(...activityConditions))
    .orderBy(desc(activities.occurredAt));

  const activityLinks = await loadLinkLabels(activityRows.map((row) => row.activity));

  const items: TimelineItem[] = activityRows.map((row, index) => ({
    id: row.activity.id,
    kind: "activity",
    type: row.activity.type,
    subject: row.activity.subject,
    body: row.activity.body,
    occurredAt: row.activity.occurredAt,
    authorName: row.authorName,
    authorId: row.activity.authorId,
    links: activityLinks[index],
    linkIds: {
      companyId: row.activity.companyId,
      contactId: row.activity.contactId,
      dealId: row.activity.dealId,
      ticketId: row.activity.ticketId,
      campaignId: row.activity.campaignId,
    },
    metadata: row.activity.metadata,
  }));

  if (!options.type) {
    const completedRows = await db
      .select({
        task: tasks,
        completedByName: users.name,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.completedById, users.id))
      .where(
        and(
          taskLinkWhere(link),
          eq(tasks.status, "completed"),
          isNotNull(tasks.completedAt),
        ),
      )
      .orderBy(desc(tasks.completedAt));

    const taskLinks = await loadLinkLabels(completedRows.map((row) => row.task));

    for (const [index, row] of completedRows.entries()) {
      items.push({
        id: row.task.id,
        kind: "task",
        type: "task",
        subject: row.task.title,
        body: row.task.description,
        occurredAt: row.task.completedAt ?? row.task.updatedAt,
        authorName: row.completedByName ?? "Team",
        links: taskLinks[index],
        linkIds: {
          companyId: row.task.companyId,
          contactId: row.task.contactId,
          dealId: row.task.dealId,
          ticketId: row.task.ticketId,
          campaignId: row.task.campaignId,
        },
      });
    }
  }

  const sorted = sortByOccurredAtDesc(items);
  const total = sorted.length;
  const offset = (page - 1) * pageSize;

  return {
    items: sorted.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

async function assertActivityLinks(input: ActivityInput) {
  const checks = await Promise.all([
    input.companyId
      ? db.select({ id: companies.id }).from(companies).where(eq(companies.id, input.companyId)).limit(1)
      : Promise.resolve([{ id: "ok" }]),
    input.contactId
      ? db.select({ id: contacts.id }).from(contacts).where(eq(contacts.id, input.contactId)).limit(1)
      : Promise.resolve([{ id: "ok" }]),
    input.dealId
      ? db.select({ id: deals.id }).from(deals).where(eq(deals.id, input.dealId)).limit(1)
      : Promise.resolve([{ id: "ok" }]),
    input.ticketId
      ? db.select({ id: tickets.id }).from(tickets).where(eq(tickets.id, input.ticketId)).limit(1)
      : Promise.resolve([{ id: "ok" }]),
    input.campaignId
      ? db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1)
      : Promise.resolve([{ id: "ok" }]),
  ]);
  if (checks.some((rows) => rows.length === 0)) {
    throw new AppError("One of the linked records no longer exists.", "INVALID_LINK");
  }
}

export async function createActivity(input: ActivityInput, actorId: string) {
  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) throw new AppError("Enter a valid activity time", "INVALID_TIME");
  if (occurredAt.getTime() > Date.now() + 60_000) {
    throw new AppError("Activity time cannot be in the future", "FUTURE_ACTIVITY");
  }
  await assertActivityLinks(input);

  const [activity] = await db
    .insert(activities)
    .values({
      type: input.type,
      subject: input.subject,
      body: input.body,
      occurredAt,
      authorId: actorId,
      companyId: input.companyId,
      contactId: input.contactId,
      dealId: input.dealId,
      ticketId: input.ticketId,
      campaignId: input.campaignId,
    })
    .returning();

  return activity;
}

export async function updateActivity(
  activityId: string,
  input: ActivityInput,
  actor: { id: string; role: "admin" | "member" },
) {
  const [activity] = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1);
  if (!activity) throw new AppError("Activity not found", "NOT_FOUND");
  if (activity.authorId !== actor.id) throw new AppError("You can only edit your own activities", "FORBIDDEN");

  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) throw new AppError("Enter a valid activity time", "INVALID_TIME");
  if (occurredAt.getTime() > Date.now() + 60_000) {
    throw new AppError("Activity time cannot be in the future", "FUTURE_ACTIVITY");
  }
  await assertActivityLinks(input);

  const [updated] = await db
    .update(activities)
    .set({
      type: input.type,
      subject: input.subject,
      body: input.body,
      occurredAt,
      companyId: input.companyId,
      contactId: input.contactId,
      dealId: input.dealId,
      ticketId: input.ticketId,
      campaignId: input.campaignId,
      updatedAt: new Date(),
    })
    .where(eq(activities.id, activityId))
    .returning();

  return updated;
}

export async function deleteActivity(
  activityId: string,
  actor: { id: string; role: "admin" | "member" },
) {
  const [activity] = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1);
  if (!activity) throw new AppError("Activity not found", "NOT_FOUND");
  if (activity.authorId !== actor.id && actor.role !== "admin") {
    throw new AppError("You cannot delete this activity", "FORBIDDEN");
  }
  await db.delete(activities).where(eq(activities.id, activityId));
}

export async function getRecentActivities(limit = 10) {
  const rows = await db
    .select({ activity: activities, authorName: users.name })
    .from(activities)
    .innerJoin(users, eq(activities.authorId, users.id))
    .orderBy(desc(activities.occurredAt))
    .limit(limit);
  const links = await loadLinkLabels(rows.map((row) => row.activity));
  return rows.map((row, index) => ({
    id: row.activity.id,
    type: row.activity.type,
    subject: row.activity.subject,
    body: row.activity.body,
    occurredAt: row.activity.occurredAt,
    authorName: row.authorName,
    links: links[index],
  }));
}

export const timelineDb = { db, asc, isNotNull };
