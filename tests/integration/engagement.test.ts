import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "./helpers";
import { createCompany, createContact, createUser } from "./factories";
import { activitySchema, taskSchema } from "@/lib/validation/engagement";
import {
  createActivity,
  deleteActivity,
  getTimeline,
  updateActivity,
} from "@/lib/services/timeline";
import {
  completeTask,
  createTask,
  deleteTask,
  getTasksForRecord,
  reopenTask,
  updateTask,
} from "@/lib/services/tasks";
import { addDays, todayUtc } from "@/lib/dates";

async function fixture() {
  const admin = await createUser({ role: "admin" });
  const member = await createUser();
  const company = await createCompany(admin.id);
  const contact = await createContact(admin.id, company.id);
  return { admin, member, company, contact };
}

describe("engagement timeline and tasks", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("logs an activity and shows it on linked record timelines", async () => {
    const { admin, company, contact } = await fixture();
    const activity = await createActivity(
      activitySchema.parse({
        type: "call",
        subject: "Discovery call",
        body: "Discussed requirements.",
        occurredAt: new Date().toISOString(),
        companyId: company.id,
        contactId: contact.id,
      }),
      admin.id,
    );

    const companyTimeline = await getTimeline({ companyId: company.id });
    const contactTimeline = await getTimeline({ contactId: contact.id });
    expect(companyTimeline.items.some((item) => item.id === activity.id)).toBe(true);
    expect(contactTimeline.items.some((item) => item.id === activity.id)).toBe(true);
    expect(companyTimeline.items[0].kind).toBe("activity");
  });

  it("rejects future activities and activities without links", () => {
    expect(() =>
      activitySchema.parse({
        type: "note",
        subject: "Future",
        occurredAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        companyId: "not-a-uuid",
      }),
    ).toThrow();
    expect(() =>
      activitySchema.parse({
        type: "note",
        subject: "No links",
        occurredAt: new Date().toISOString(),
      }),
    ).toThrow("at least one record");
  });

  it("enforces activity edit and delete permissions", async () => {
    const { admin, member, company } = await fixture();
    const activity = await createActivity(
      activitySchema.parse({
        type: "note",
        subject: "Original",
        occurredAt: new Date().toISOString(),
        companyId: company.id,
      }),
      admin.id,
    );

    await expect(
      updateActivity(
        activity.id,
        activitySchema.parse({
          type: "note",
          subject: "Hijacked",
          occurredAt: new Date().toISOString(),
          companyId: company.id,
        }),
        member,
      ),
    ).rejects.toThrow("only edit your own");

    const updated = await updateActivity(
      activity.id,
      activitySchema.parse({
        type: "note",
        subject: "Updated",
        occurredAt: new Date().toISOString(),
        companyId: company.id,
      }),
      admin,
    );
    expect(updated.subject).toBe("Updated");

    await expect(deleteActivity(activity.id, member)).rejects.toThrow("cannot delete");
    await deleteActivity(activity.id, admin);
    expect((await getTimeline({ companyId: company.id })).items).toHaveLength(0);
  });

  it("creates, completes, reopens, and deletes a task", async () => {
    const { admin, company } = await fixture();
    const dueDate = addDays(new Date(), 2).toISOString().slice(0, 10);
    const task = await createTask(
      taskSchema.parse({
        title: "Follow up",
        dueDate,
        priority: "high",
        companyId: company.id,
      }),
      admin.id,
    );
    expect(task.status).toBe("open");
    expect(task.assigneeId).toBe(admin.id);

    const completed = await completeTask(task.id, admin.id);
    expect(completed.status).toBe("completed");
    expect(completed.completedById).toBe(admin.id);
    expect(completed.completedAt).not.toBeNull();

    const timeline = await getTimeline({ companyId: company.id });
    expect(timeline.items.some((item) => item.kind === "task" && item.id === task.id)).toBe(true);

    const reopened = await reopenTask(task.id);
    expect(reopened.status).toBe("open");
    expect(reopened.completedAt).toBeNull();

    await deleteTask(task.id);
    expect(await getTasksForRecord({ companyId: company.id })).toHaveLength(0);
  });

  it("rejects past due dates and unlinked tasks", () => {
    expect(() =>
      taskSchema.parse({
        title: "No link",
        dueDate: todayUtc(),
      }),
    ).toThrow("at least one record");
    expect(() =>
      taskSchema.parse({
        title: "Bad date",
        dueDate: todayUtc(),
        companyId: "not-a-uuid",
      }),
    ).toThrow();
  });

  it("updates a task and reassigns it", async () => {
    const { admin, member, company } = await fixture();
    const task = await createTask(
      taskSchema.parse({
        title: "Initial",
        dueDate: addDays(new Date(), 1).toISOString().slice(0, 10),
        companyId: company.id,
      }),
      admin.id,
    );
    const updated = await updateTask(task.id, {
      title: "Updated",
      description: "New details",
      dueDate: addDays(new Date(), 3).toISOString().slice(0, 10),
      priority: "low",
      assigneeId: member.id,
      companyId: company.id,
      contactId: null,
      dealId: null,
      ticketId: null,
      campaignId: null,
    });
    expect(updated.title).toBe("Updated");
    expect(updated.assigneeId).toBe(member.id);
    expect(updated.priority).toBe("low");
  });
});
