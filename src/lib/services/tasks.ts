import { and, asc, count, desc, eq, inArray, isNotNull, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db";
import {
  campaigns,
  companies,
  contacts,
  deals,
  tasks,
  tickets,
  users,
  type Task,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import { todayUtc } from "@/lib/dates";
import { loadLinkLabels, type RecordLinks, type TimelineLink } from "@/lib/services/timeline";
import type { TaskInput } from "@/lib/validation/engagement";

export type TaskListItem = Task & {
  assigneeName: string | null;
  assigneeStatus: "active" | "inactive" | null;
  links: TimelineLink[];
  isOverdue: boolean;
};

async function assertActiveAssignee(assigneeId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, assigneeId)).limit(1);
  if (!user) throw new AppError("Assignee not found", "NOT_FOUND");
  if (user.status !== "active") throw new AppError("Choose an active team member as assignee", "INACTIVE_ASSIGNEE");
}

async function assertTaskLinks(input: TaskInput) {
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

export async function createTask(input: TaskInput, actorId: string) {
  if (input.dueDate < todayUtc()) {
    throw new AppError("Due date cannot be before today", "PAST_DUE_DATE");
  }
  const assigneeId = input.assigneeId ?? actorId;
  await assertActiveAssignee(assigneeId);
  await assertTaskLinks(input);

  const [task] = await db
    .insert(tasks)
    .values({
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      priority: input.priority,
      status: "open",
      assigneeId,
      createdById: actorId,
      companyId: input.companyId,
      contactId: input.contactId,
      dealId: input.dealId,
      ticketId: input.ticketId,
      campaignId: input.campaignId,
    })
    .returning();

  return task;
}

export async function updateTask(taskId: string, input: TaskInput) {
  const [existing] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!existing) throw new AppError("Task not found", "NOT_FOUND");
  if (input.assigneeId) await assertActiveAssignee(input.assigneeId);
  await assertTaskLinks(input);

  const [task] = await db
    .update(tasks)
    .set({
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      priority: input.priority,
      assigneeId: input.assigneeId,
      companyId: input.companyId,
      contactId: input.contactId,
      dealId: input.dealId,
      ticketId: input.ticketId,
      campaignId: input.campaignId,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId))
    .returning();

  return task;
}

export async function completeTask(taskId: string, actorId: string) {
  const [task] = await db
    .update(tasks)
    .set({
      status: "completed",
      completedById: actorId,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId))
    .returning();
  if (!task) throw new AppError("Task not found", "NOT_FOUND");
  return task;
}

export async function reopenTask(taskId: string) {
  const [task] = await db
    .update(tasks)
    .set({
      status: "open",
      completedById: null,
      completedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId))
    .returning();
  if (!task) throw new AppError("Task not found", "NOT_FOUND");
  return task;
}

export async function deleteTask(taskId: string) {
  const [task] = await db.delete(tasks).where(eq(tasks.id, taskId)).returning();
  if (!task) throw new AppError("Task not found", "NOT_FOUND");
}

export async function getTask(taskId: string) {
  const [row] = await db
    .select({
      task: tasks,
      assigneeName: users.name,
      assigneeStatus: users.status,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!row) return null;
  const links = await loadLinkLabels([row.task]);
  return { ...row.task, assigneeName: row.assigneeName, assigneeStatus: row.assigneeStatus, links: links[0] };
}

export async function listTasks(
  options: {
    view: "mine" | "all";
    userId: string;
    assigneeId?: string;
    priority?: "low" | "normal" | "high";
    status?: "open" | "completed";
    recordType?: "company" | "contact" | "deal" | "ticket" | "campaign";
  },
) {
  const conditions = [];
  if (options.view === "mine") conditions.push(eq(tasks.assigneeId, options.userId));
  if (options.assigneeId) conditions.push(eq(tasks.assigneeId, options.assigneeId));
  if (options.priority) conditions.push(eq(tasks.priority, options.priority));
  if (options.status) conditions.push(eq(tasks.status, options.status));
  if (options.recordType === "company") conditions.push(isNotNull(tasks.companyId));
  if (options.recordType === "contact") conditions.push(isNotNull(tasks.contactId));
  if (options.recordType === "deal") conditions.push(isNotNull(tasks.dealId));
  if (options.recordType === "ticket") conditions.push(isNotNull(tasks.ticketId));
  if (options.recordType === "campaign") conditions.push(isNotNull(tasks.campaignId));

  const rows = await db
    .select({ task: tasks, assigneeName: users.name, assigneeStatus: users.status })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(tasks.dueDate), desc(tasks.priority))
    .limit(500);

  const linkRows = await loadLinkLabels(rows.map((row) => row.task));
  const today = todayUtc();

  const items: TaskListItem[] = rows.map((row, index) => ({
    ...row.task,
    assigneeName: row.assigneeName,
    assigneeStatus: row.assigneeStatus,
    links: linkRows[index],
    isOverdue: row.task.status === "open" && row.task.dueDate < today,
  }));

  return items;
}

export async function getTasksForRecord(link: RecordLinks) {
  const conditions = [];
  if (link.companyId) conditions.push(eq(tasks.companyId, link.companyId));
  if (link.contactId) conditions.push(eq(tasks.contactId, link.contactId));
  if (link.dealId) conditions.push(eq(tasks.dealId, link.dealId));
  if (link.ticketId) conditions.push(eq(tasks.ticketId, link.ticketId));
  if (link.campaignId) conditions.push(eq(tasks.campaignId, link.campaignId));

  const rows = await db
    .select({ task: tasks, assigneeName: users.name, assigneeStatus: users.status })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(and(...conditions))
    .orderBy(asc(tasks.status), asc(tasks.dueDate))
    .limit(200);

  const linkRows = await loadLinkLabels(rows.map((row) => row.task));
  const today = todayUtc();

  return rows.map((row, index) => ({
    ...row.task,
    assigneeName: row.assigneeName,
    assigneeStatus: row.assigneeStatus,
    links: linkRows[index],
    isOverdue: row.task.status === "open" && row.task.dueDate < today,
  }));
}

export async function getTaskStats(userId: string) {
  const today = todayUtc();
  const [openRows, completedRow] = await Promise.all([
    db.select({ task: tasks }).from(tasks).where(eq(tasks.assigneeId, userId)),
    db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, userId), eq(tasks.status, "completed"))),
  ]);

  const open = openRows.map((row) => row.task).filter((task) => task.status === "open");
  return {
    overdue: open.filter((task) => task.dueDate < today).length,
    dueToday: open.filter((task) => task.dueDate === today).length,
    upcoming: open.filter((task) => task.dueDate > today).length,
    completed: Number(completedRow[0]?.count ?? 0),
  };
}

export const taskServiceInternals = { or, inArray, isNull, ne };
