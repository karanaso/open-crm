import { and, asc, count, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, campaignRecipients, deals, stages, tickets } from "@/db/schema";
import { getTaskStats } from "@/lib/services/tasks";
import { getRecentActivities } from "@/lib/services/timeline";
import { getDefaultPipeline } from "@/lib/services/pipelines";
import { getListingsDashboard } from "@/lib/services/listings-dashboard";
import { getTicketSla } from "@/lib/sla";
import { addDays, todayUtc } from "@/lib/dates";
import { ACTIVE_TICKET_STATUSES } from "@/lib/constants";

export type CurrencyTotal = {
  currency: string;
  total: number;
};

function currencyTotals(rows: Array<{ currency: string; value: string | number | null }>) {
  return rows
    .map((row) => ({ currency: row.currency, total: Number(row.value ?? 0) }))
    .sort((left, right) => left.currency.localeCompare(right.currency));
}

export async function getSalesDashboard() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const today = todayUtc(now);
  const inThirtyDays = addDays(now, 30).toISOString().slice(0, 10);

  const [openRows, weightedRows, wonRows, wonLostRows, closingRow] = await Promise.all([
    db
      .select({
        currency: deals.currency,
        count: count(),
        value: sql<string>`coalesce(sum(${deals.amount}), 0)`,
      })
      .from(deals)
      .where(eq(deals.status, "open"))
      .groupBy(deals.currency)
      .orderBy(asc(deals.currency)),
    db
      .select({
        currency: deals.currency,
        value: sql<string>`coalesce(sum(${deals.amount} * ${stages.probability} / 100.0), 0)`,
      })
      .from(deals)
      .innerJoin(stages, eq(deals.stageId, stages.id))
      .where(eq(deals.status, "open"))
      .groupBy(deals.currency)
      .orderBy(asc(deals.currency)),
    db
      .select({
        currency: deals.currency,
        count: count(),
        value: sql<string>`coalesce(sum(${deals.amount}), 0)`,
      })
      .from(deals)
      .where(and(eq(deals.status, "won"), gte(deals.closedAt, monthStart)))
      .groupBy(deals.currency)
      .orderBy(asc(deals.currency)),
    db
      .select({ status: deals.status, count: count() })
      .from(deals)
      .where(and(gte(deals.closedAt, monthStart), sql`${deals.status} in ('won', 'lost')`))
      .groupBy(deals.status),
    db
      .select({ count: count() })
      .from(deals)
      .where(
        and(
          eq(deals.status, "open"),
          gte(deals.expectedCloseDate, today),
          lte(deals.expectedCloseDate, inThirtyDays),
        ),
      ),
  ]);

  const won = Number(wonLostRows.find((row) => row.status === "won")?.count ?? 0);
  const lost = Number(wonLostRows.find((row) => row.status === "lost")?.count ?? 0);
  const winRate = won + lost > 0 ? (won / (won + lost)) * 100 : 0;

  return {
    openCount: openRows.reduce((sum, row) => sum + Number(row.count), 0),
    openValueByCurrency: currencyTotals(openRows),
    weightedValueByCurrency: currencyTotals(weightedRows),
    wonThisMonthCount: wonRows.reduce((sum, row) => sum + Number(row.count), 0),
    wonThisMonthByCurrency: currencyTotals(wonRows),
    winRate,
    closingSoonCount: Number(closingRow[0]?.count ?? 0),
  };
}

export async function getSupportDashboard() {
  const now = new Date();
  const thirtyDaysAgo = addDays(now, -30);
  const ticketRows = await db.select().from(tickets);

  const active = ticketRows.filter((ticket) =>
    (ACTIVE_TICKET_STATUSES as readonly string[]).includes(ticket.status),
  );
  const overdue = active.filter((ticket) => getTicketSla(ticket, now).isOverdue);
  const unassigned = active.filter((ticket) => !ticket.assigneeId);
  const resolvedRecently = ticketRows.filter(
    (ticket) => ticket.resolvedAt && ticket.resolvedAt >= thirtyDaysAgo,
  );

  const firstResponseSamples = resolvedRecently
    .filter((ticket) => ticket.firstResponseAt)
    .map((ticket) => (ticket.firstResponseAt!.getTime() - ticket.createdAt.getTime()) / 3_600_000);
  const resolutionSamples = resolvedRecently
    .filter((ticket) => ticket.resolvedAt)
    .map((ticket) => (ticket.resolvedAt!.getTime() - ticket.createdAt.getTime()) / 3_600_000);

  const average = (values: number[]) =>
    values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  return {
    openCount: active.length,
    unassignedCount: unassigned.length,
    overdueCount: overdue.length,
    averageFirstResponseHours: average(firstResponseSamples),
    averageResolutionHours: average(resolutionSamples),
  };
}

export async function getMarketingDashboard() {
  const [activeCampaignRow, recipientRows] = await Promise.all([
    db.select({ count: count() }).from(campaigns).where(eq(campaigns.status, "active")),
    db
      .select({ status: campaignRecipients.status, count: count() })
      .from(campaignRecipients)
      .innerJoin(campaigns, eq(campaignRecipients.campaignId, campaigns.id))
      .where(eq(campaigns.status, "active"))
      .groupBy(campaignRecipients.status),
  ]);

  const counts = Object.fromEntries(
    recipientRows.map((row) => [row.status, Number(row.count)]),
  ) as Record<string, number>;
  const audience = recipientRows.reduce((sum, row) => sum + Number(row.count), 0);
  const responses = (counts.responded ?? 0) + (counts.converted ?? 0);

  return {
    activeCampaigns: Number(activeCampaignRow[0]?.count ?? 0),
    audience,
    responses,
    conversions: counts.converted ?? 0,
    responseRate: audience > 0 ? (responses / audience) * 100 : 0,
  };
}

export async function getTicketStatusChart() {
  const rows = await db
    .select({ status: tickets.status, count: count() })
    .from(tickets)
    .groupBy(tickets.status);
  return rows.map((row) => ({ status: row.status, count: Number(row.count) }));
}

export async function getCampaignEngagementChart() {
  const rows = await db
    .select({ status: campaignRecipients.status, count: count() })
    .from(campaignRecipients)
    .innerJoin(campaigns, eq(campaignRecipients.campaignId, campaigns.id))
    .where(eq(campaigns.status, "active"))
    .groupBy(campaignRecipients.status);
  return rows.map((row) => ({ status: row.status, count: Number(row.count) }));
}

export async function getPipelineChart() {
  const pipeline = await getDefaultPipeline();
  if (!pipeline) return [];

  const [stageRows, totals] = await Promise.all([
    db
      .select({ id: stages.id, name: stages.name, position: stages.position })
      .from(stages)
      .where(eq(stages.pipelineId, pipeline.id))
      .orderBy(stages.position),
    db
      .select({
        stageId: deals.stageId,
        currency: deals.currency,
        value: sql<string>`coalesce(sum(${deals.amount}), 0)`,
      })
      .from(deals)
      .where(and(eq(deals.pipelineId, pipeline.id), eq(deals.status, "open")))
      .groupBy(deals.stageId, deals.currency)
      .orderBy(deals.currency),
  ]);

  const currencies = [...new Set(totals.map((row) => row.currency))].sort();
  if (currencies.length === 0) return [];

  const totalsByStageAndCurrency = new Map(
    totals.map((row) => [`${row.stageId}:${row.currency}`, Number(row.value)]),
  );

  return stageRows.flatMap((stage) =>
    currencies.map((currency) => ({
      stage: stage.name,
      currency,
      value: totalsByStageAndCurrency.get(`${stage.id}:${currency}`) ?? 0,
    })),
  );
}

export async function getDashboardData(userId: string) {
  const [
    sales,
    support,
    marketing,
    tasks,
    recentActivity,
    listings,
    pipelineChart,
    ticketChart,
    campaignChart,
  ] = await Promise.all([
    getSalesDashboard(),
    getSupportDashboard(),
    getMarketingDashboard(),
    getTaskStats(userId),
    getRecentActivities(10),
    getListingsDashboard(),
    getPipelineChart(),
    getTicketStatusChart(),
    getCampaignEngagementChart(),
  ]);

  return {
    sales,
    support,
    marketing,
    tasks,
    recentActivity,
    listings,
    charts: {
      pipeline: pipelineChart,
      tickets: ticketChart,
      campaign: campaignChart,
    },
  };
}
