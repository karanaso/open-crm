import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "./helpers";
import {
  createCompany,
  createContact,
  createListing,
  createTestPipeline,
  createUser,
} from "./factories";
import { activitySchema, taskSchema } from "@/lib/validation/engagement";
import { dealSchema } from "@/lib/validation/deal";
import {
  createActivity,
  deleteActivity,
  getRecentActivities,
  getTimeline,
  updateActivity,
} from "@/lib/services/timeline";
import {
  completeTask,
  createTask,
  deleteTask,
  getTasksForRecord,
  listTasks,
  reopenTask,
  updateTask,
} from "@/lib/services/tasks";
import { createDeal } from "@/lib/services/deals";
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
    ).toThrow("validation.activityLinkRequired");
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
    ).toThrow("validation.taskLinkRequired");
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
      listingId: null,
      ticketId: null,
      campaignId: null,
    });
    expect(updated.title).toBe("Updated");
    expect(updated.assigneeId).toBe(member.id);
    expect(updated.priority).toBe("low");
  });

  it("shows listing activities on the listing timeline", async () => {
    const { admin, contact } = await fixture();
    const listing = await createListing(contact.id, admin.id);
    const activity = await createActivity(
      activitySchema.parse({
        type: "note",
        subject: "Listing note",
        occurredAt: new Date().toISOString(),
        listingId: listing.id,
      }),
      admin.id,
    );

    const timeline = await getTimeline({ listingId: listing.id });
    const item = timeline.items.find((entry) => entry.id === activity.id);
    expect(item).toBeDefined();
    expect(item?.linkIds.listingId).toBe(listing.id);
    expect(item?.links).toContainEqual(
      expect.objectContaining({
        type: "listing",
        id: listing.id,
        href: `/listings/${listing.id}`,
      }),
    );

    const recent = await getRecentActivities(10);
    const recentItem = recent.find((entry) => entry.id === activity.id);
    expect(
      recentItem?.links.some((link) => link.type === "listing" && link.id === listing.id),
    ).toBe(true);
  });

  it("creates listing tasks, completes them, and removes a listing link", async () => {
    const { admin, company, contact } = await fixture();
    const listing = await createListing(contact.id, admin.id);
    const task = await createTask(
      taskSchema.parse({
        title: "Prepare listing pack",
        dueDate: addDays(new Date(), 2).toISOString().slice(0, 10),
        companyId: company.id,
        listingId: listing.id,
      }),
      admin.id,
    );

    expect(await getTasksForRecord({ listingId: listing.id })).toHaveLength(1);
    await completeTask(task.id, admin.id);
    const timeline = await getTimeline({ listingId: listing.id });
    expect(timeline.items.some((item) => item.kind === "task" && item.id === task.id)).toBe(true);

    const unlinked = await updateTask(
      task.id,
      taskSchema.parse({
        title: "Prepare listing pack",
        dueDate: addDays(new Date(), 2).toISOString().slice(0, 10),
        companyId: company.id,
        listingId: null,
      }),
    );
    expect(unlinked.listingId).toBeNull();
    expect(await getTasksForRecord({ listingId: listing.id })).toHaveLength(0);
    expect(await getTasksForRecord({ companyId: company.id })).toHaveLength(1);
  });

  it("filters tasks by the listing record type", async () => {
    const { admin, company, contact } = await fixture();
    const listing = await createListing(contact.id, admin.id);
    const listingTask = await createTask(
      taskSchema.parse({
        title: "Listing task",
        dueDate: addDays(new Date(), 2).toISOString().slice(0, 10),
        listingId: listing.id,
      }),
      admin.id,
    );
    const companyTask = await createTask(
      taskSchema.parse({
        title: "Company task",
        dueDate: addDays(new Date(), 2).toISOString().slice(0, 10),
        companyId: company.id,
      }),
      admin.id,
    );

    const filtered = await listTasks({
      view: "all",
      userId: admin.id,
      recordType: "listing",
    });
    expect(filtered.map((task) => task.id)).toContain(listingTask.id);
    expect(filtered.map((task) => task.id)).not.toContain(companyTask.id);
  });

  it("links a multi-record activity to every record timeline", async () => {
    const { admin, company, contact } = await fixture();
    const listing = await createListing(contact.id, admin.id);
    const { pipeline, openStage } = await createTestPipeline();
    const deal = await createDeal(
      dealSchema.parse({
        name: "Multi-link deal",
        companyId: company.id,
        contactId: contact.id,
        listingId: listing.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "1000",
      }),
      admin.id,
    );

    const activity = await createActivity(
      activitySchema.parse({
        type: "meeting",
        subject: "Full viewing",
        occurredAt: new Date().toISOString(),
        companyId: company.id,
        contactId: contact.id,
        dealId: deal.id,
        listingId: listing.id,
      }),
      admin.id,
    );

    for (const link of [
      { companyId: company.id },
      { contactId: contact.id },
      { dealId: deal.id },
      { listingId: listing.id },
    ]) {
      const timeline = await getTimeline(link);
      expect(timeline.items.some((item) => item.id === activity.id)).toBe(true);
    }

    const timeline = await getTimeline({ listingId: listing.id });
    expect(timeline.items[0].links.map((link) => link.type).sort()).toEqual([
      "company",
      "contact",
      "deal",
      "listing",
    ]);
  });
});
