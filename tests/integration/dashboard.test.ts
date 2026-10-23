import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tickets, tasks } from "@/db/schema";
import { resetDatabase } from "./helpers";
import { createCompany, createContact, createTestPipeline, createUser } from "./factories";
import { createDeal } from "@/lib/services/deals";
import { dealSchema } from "@/lib/validation/deal";
import { createTicket, addTicketComment, changeTicketStatus } from "@/lib/services/tickets";
import { ticketSchema } from "@/lib/validation/ticket";
import { createTask } from "@/lib/services/tasks";
import { taskSchema } from "@/lib/validation/engagement";
import { createSegment, createCampaign, activateCampaign } from "@/lib/services/marketing";
import { campaignSchema, segmentSchema } from "@/lib/validation/marketing";
import { createContact as createContactService } from "@/lib/services/contacts";
import { contactSchema } from "@/lib/validation/contact";
import {
  getCampaignEngagementChart,
  getMarketingDashboard,
  getPipelineChart,
  getSalesDashboard,
  getSupportDashboard,
  getTicketStatusChart,
} from "@/lib/services/dashboard";
import { getTaskStats } from "@/lib/services/tasks";
import { todayUtc, addDays } from "@/lib/dates";

describe("dashboard aggregates", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("calculates sales metrics for open, won, and lost deals", async () => {
    const admin = await createUser({ role: "admin" });
    const company = await createCompany(admin.id);
    const { pipeline, openStage, wonStage, lostStage } = await createTestPipeline();

    await createDeal(
      dealSchema.parse({
        name: "Open 1",
        companyId: company.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "10000",
      }),
      admin.id,
    );
    await createDeal(
      dealSchema.parse({
        name: "Open 2",
        companyId: company.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "5000",
      }),
      admin.id,
    );
    await createDeal(
      dealSchema.parse({
        name: "Won",
        companyId: company.id,
        pipelineId: pipeline.id,
        stageId: wonStage.id,
        ownerId: admin.id,
        amount: "20000",
        lostReason: null,
      }),
      admin.id,
    );
    await createDeal(
      dealSchema.parse({
        name: "Lost",
        companyId: company.id,
        pipelineId: pipeline.id,
        stageId: lostStage.id,
        ownerId: admin.id,
        amount: "7000",
        lostReason: "Budget",
      }),
      admin.id,
    );

    const sales = await getSalesDashboard();
    expect(sales.openCount).toBe(2);
    expect(sales.openValue).toBe(15000);
    expect(sales.weightedValue).toBe(3000);
    expect(sales.wonThisMonthCount).toBe(1);
    expect(sales.winRate).toBe(50);
    expect(sales.closingSoonCount).toBe(0);
  });

  it("calculates support metrics from active and resolved tickets", async () => {
    const admin = await createUser({ role: "admin" });
    const contact = await createContact(admin.id, null);

    const active = await createTicket(
      ticketSchema.parse({
        subject: "Active",
        description: "Active",
        requesterContactId: contact.id,
        priority: "urgent",
      }),
      admin.id,
    );
    await db
      .update(tickets)
      .set({ createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000) })
      .where(eq(tickets.id, active.id));

    const resolved = await createTicket(
      ticketSchema.parse({
        subject: "Resolved",
        description: "Resolved",
        requesterContactId: contact.id,
        priority: "normal",
      }),
      admin.id,
    );
    await addTicketComment(
      resolved.id,
      { body: "Reply", visibility: "reply" },
      admin,
    );
    await changeTicketStatus(resolved.id, "resolved");

    const support = await getSupportDashboard();
    expect(support.openCount).toBe(1);
    expect(support.overdueCount).toBe(1);
    expect(support.averageFirstResponseHours).toBeGreaterThanOrEqual(0);
    expect(support.averageResolutionHours).toBeGreaterThanOrEqual(0);
  });

  it("aggregates marketing metrics for active campaigns only", async () => {
    const admin = await createUser({ role: "admin" });
    const company = await createCompany(admin.id, { industry: "Software" });
    await createContactService(
      contactSchema.parse({
        firstName: "Jordan",
        lastName: "Lee",
        email: "jordan@dashboard.test",
        companyId: company.id,
        ownerId: admin.id,
        tags: ["vip"],
      }),
      admin.id,
    );
    const segment = await createSegment(
      segmentSchema.parse({ name: "VIP", criteria: { tags: ["vip"] } }),
      admin.id,
    );
    const campaign = await createCampaign(
      campaignSchema.parse({
        name: "Active campaign",
        channel: "email",
        segmentId: segment.id,
        ownerId: admin.id,
      }),
      admin.id,
    );
    await activateCampaign(campaign.id, admin.id);

    const marketing = await getMarketingDashboard();
    expect(marketing.activeCampaigns).toBe(1);
    expect(marketing.audience).toBe(1);
    expect(marketing.responseRate).toBe(0);
    expect(await getCampaignEngagementChart()).toHaveLength(1);
  });

  it("counts personal task groups", async () => {
    const admin = await createUser({ role: "admin" });
    const company = await createCompany(admin.id);
    const today = todayUtc();
    const dueToday = await createTask(
      taskSchema.parse({
        title: "Due today",
        dueDate: today,
        companyId: company.id,
      }),
      admin.id,
    );
    await createTask(
      taskSchema.parse({
        title: "Upcoming",
        dueDate: addDays(new Date(), 3).toISOString().slice(0, 10),
        companyId: company.id,
      }),
      admin.id,
    );
    await db
      .update(tasks)
      .set({ dueDate: addDays(new Date(), -2).toISOString().slice(0, 10) })
      .where(eq(tasks.id, dueToday.id));

    const stats = await getTaskStats(admin.id);
    expect(stats.overdue).toBe(1);
    expect(stats.dueToday).toBe(0);
    expect(stats.upcoming).toBe(1);
  });

  it("builds chart datasets", async () => {
    const admin = await createUser({ role: "admin" });
    const company = await createCompany(admin.id);
    const contact = await createContact(admin.id, company.id);
    const { pipeline, openStage } = await createTestPipeline();
    await createDeal(
      dealSchema.parse({
        name: "Chart deal",
        companyId: company.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "1000",
      }),
      admin.id,
    );
    await createTicket(
      ticketSchema.parse({
        subject: "Chart ticket",
        description: "Ticket",
        requesterContactId: contact.id,
      }),
      admin.id,
    );

    expect((await getPipelineChart()).length).toBeGreaterThan(0);
    expect((await getTicketStatusChart()).some((row) => row.count > 0)).toBe(true);
  });
});
