import { and, asc, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import {
  activities,
  companies,
  contacts,
  deals,
  listings,
  pipelines,
  stages,
  users,
  type Company,
  type Deal,
  type Listing,
  type Stage,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import type { DealInput } from "@/lib/validation/deal";
import type { dealListParamsSchema } from "@/lib/validation/deal";
import { getWorkspaceDefaults } from "@/lib/services/workspace-settings";

type DealListParams = z.infer<typeof dealListParamsSchema>;

export type CurrencyTotal = {
  currency: string;
  total: number;
};

function groupCurrencyTotals<T extends { currency: string }>(
  rows: T[],
  getAmount: (row: T) => number,
): CurrencyTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + getAmount(row));
  }
  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, total]) => ({ currency, total }));
}

function statusForOutcome(outcome: Stage["outcome"]): Deal["status"] {
  return outcome;
}

export async function getDeal(dealId: string) {
  const [row] = await db
    .select({
      deal: deals,
      companyName: companies.name,
      companyArchivedAt: companies.archivedAt,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      listingTitle: listings.title,
      listingReference: listings.reference,
      pipelineName: pipelines.name,
      stageName: stages.name,
      stageOutcome: stages.outcome,
      stageProbability: stages.probability,
      stagePosition: stages.position,
      ownerName: users.name,
      ownerStatus: users.status,
    })
    .from(deals)
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .innerJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(listings, eq(deals.listingId, listings.id))
    .innerJoin(pipelines, eq(deals.pipelineId, pipelines.id))
    .innerJoin(stages, eq(deals.stageId, stages.id))
    .innerJoin(users, eq(deals.ownerId, users.id))
    .where(eq(deals.id, dealId))
    .limit(1);

  if (!row) return null;

  return {
    ...row.deal,
    companyName: row.companyName,
    companyArchivedAt: row.companyArchivedAt,
    contactName: `${row.contactFirstName} ${row.contactLastName}`.trim(),
    listingTitle: row.listingTitle,
    listingReference: row.listingReference,
    pipelineName: row.pipelineName,
    stageName: row.stageName,
    stageOutcome: row.stageOutcome,
    stageProbability: row.stageProbability,
    stagePosition: row.stagePosition,
    ownerName: row.ownerName,
    ownerStatus: row.ownerStatus,
  };
}

export async function listDeals(params: DealListParams) {
  const conditions = [];
  if (params.q) {
    const pattern = `%${params.q}%`;
    conditions.push(
      or(
        ilike(deals.name, pattern),
        ilike(contacts.firstName, pattern),
        ilike(contacts.lastName, pattern),
        sql`(${contacts.firstName} || ' ' || ${contacts.lastName}) ilike ${pattern}`,
        ilike(companies.name, pattern),
      ),
    );
  }
  if (params.pipelineId) conditions.push(eq(deals.pipelineId, params.pipelineId));
  if (params.stageId) conditions.push(eq(deals.stageId, params.stageId));
  if (params.status) conditions.push(eq(deals.status, params.status));
  if (params.ownerId) conditions.push(eq(deals.ownerId, params.ownerId));
  if (params.currency) conditions.push(eq(deals.currency, params.currency));
  if (params.closeFrom) conditions.push(gte(deals.expectedCloseDate, params.closeFrom));
  if (params.closeTo) conditions.push(lte(deals.expectedCloseDate, params.closeTo));

  const where = conditions.length ? and(...conditions) : undefined;
  const orderBy =
    params.sort === "amount_desc"
      ? desc(deals.amount)
      : params.sort === "amount_asc"
        ? asc(deals.amount)
        : params.sort === "close_date"
          ? asc(deals.expectedCloseDate)
          : desc(deals.updatedAt);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        deal: deals,
        companyName: companies.name,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        listingReference: listings.reference,
        stageName: stages.name,
        stageOutcome: stages.outcome,
        pipelineName: pipelines.name,
        ownerName: users.name,
        ownerStatus: users.status,
      })
      .from(deals)
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .innerJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(listings, eq(deals.listingId, listings.id))
      .innerJoin(stages, eq(deals.stageId, stages.id))
      .innerJoin(pipelines, eq(deals.pipelineId, pipelines.id))
      .innerJoin(users, eq(deals.ownerId, users.id))
      .where(where)
      .orderBy(orderBy)
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db
      .select({ count: count() })
      .from(deals)
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .innerJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(listings, eq(deals.listingId, listings.id))
      .where(where),
  ]);

  const total = Number(totalRow[0]?.count ?? 0);
  return {
    items: rows.map((row) => ({
      ...row.deal,
      companyName: row.companyName,
      contactName: `${row.contactFirstName} ${row.contactLastName}`.trim(),
      listingReference: row.listingReference,
      stageName: row.stageName,
      stageOutcome: row.stageOutcome,
      pipelineName: row.pipelineName,
      ownerName: row.ownerName,
      ownerStatus: row.ownerStatus,
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getDealsForBoard(pipelineId: string) {
  const rows = await db
    .select({
      deal: deals,
      companyName: companies.name,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      listingReference: listings.reference,
      listingTitle: listings.title,
      ownerName: users.name,
      stage: stages,
    })
    .from(deals)
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .innerJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(listings, eq(deals.listingId, listings.id))
    .innerJoin(users, eq(deals.ownerId, users.id))
    .innerJoin(stages, eq(deals.stageId, stages.id))
    .where(eq(deals.pipelineId, pipelineId))
    .orderBy(desc(deals.updatedAt));

  return rows.map((row) => ({
    ...row.deal,
    companyName: row.companyName,
    contactName: `${row.contactFirstName} ${row.contactLastName}`.trim(),
    listingReference: row.listingReference,
    listingTitle: row.listingTitle,
    ownerName: row.ownerName,
    stage: row.stage,
  }));
}

export async function getPipelineMetrics(pipelineId: string) {
  const pipelineStages = await db
    .select()
    .from(stages)
    .where(eq(stages.pipelineId, pipelineId))
    .orderBy(asc(stages.position));
  const boardDeals = await getDealsForBoard(pipelineId);

  return pipelineStages.map((stage) => {
    const stageDeals = boardDeals.filter(
      (deal) => deal.stageId === stage.id && deal.status === "open",
    );
    return {
      ...stage,
      dealCount: stageDeals.length,
      totalValueByCurrency: groupCurrencyTotals(stageDeals, (deal) => Number(deal.amount)),
      weightedValueByCurrency: groupCurrencyTotals(
        stageDeals,
        (deal) => (Number(deal.amount) * stage.probability) / 100,
      ),
    };
  });
}

async function validateDeal(input: DealInput, actorId: string, existing?: Deal | null) {
  const ownerId = input.ownerId ?? existing?.ownerId ?? actorId;
  const [owner] = await db.select().from(users).where(eq(users.id, ownerId)).limit(1);
  if (!owner) throw new AppError("Owner not found", "NOT_FOUND");
  if (owner.status !== "active" && ownerId !== existing?.ownerId) {
    throw new AppError("Choose an active team member as owner", "INACTIVE_OWNER");
  }

  let company: Company | null = null;
  if (input.companyId) {
    const [row] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, input.companyId))
      .limit(1);
    if (!row) throw new AppError("Company not found", "NOT_FOUND");
    if (row.archivedAt && input.companyId !== existing?.companyId) {
      throw new AppError("Choose an active company", "ARCHIVED_COMPANY");
    }
    company = row;
  }

  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, input.contactId))
    .limit(1);
  if (!contact) throw new AppError("Contact not found", "NOT_FOUND");
  if (company && contact.companyId !== company.id) {
    throw new AppError(
      "The primary contact must belong to the selected company.",
      "CONTACT_COMPANY_MISMATCH",
    );
  }

  let listing: Listing | null = null;
  if (input.listingId) {
    const [row] = await db.select().from(listings).where(eq(listings.id, input.listingId)).limit(1);
    if (!row) throw new AppError("Listing not found", "NOT_FOUND");
    listing = row;
  }

  const [stage] = await db.select().from(stages).where(eq(stages.id, input.stageId)).limit(1);
  if (!stage) throw new AppError("Stage not found", "NOT_FOUND");
  if (stage.pipelineId !== input.pipelineId) {
    throw new AppError(
      "The selected stage does not belong to the selected pipeline.",
      "STAGE_PIPELINE_MISMATCH",
    );
  }

  if (stage.outcome === "lost" && !input.lostReason) {
    throw new AppError("A lost reason is required for a lost deal.", "LOST_REASON_REQUIRED");
  }

  const listingChanged = Boolean(listing && input.listingId !== existing?.listingId);
  const inheritedCurrency =
    listing && (!existing || listingChanged)
      ? listing.currency
      : (existing?.currency ?? listing?.currency ?? null);
  const currency =
    input.currency ?? inheritedCurrency ?? (await getWorkspaceDefaults()).defaultCurrency;

  const inheritedPropertyPrice =
    listing && (!existing || listingChanged) ? Number(listing.price) : null;
  const propertyPrice = input.propertyPrice ?? inheritedPropertyPrice;

  const inheritedAmount =
    listing && (!existing || listingChanged)
      ? Number(listing.commissionAmount)
      : existing
        ? Number(existing.amount)
        : 0;
  const amount = input.amount ?? inheritedAmount;

  return { ownerId, stage, company, currency, propertyPrice, amount };
}

async function insertStageChange(
  executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
  deal: Deal,
  fromStage: { id: string; name: string },
  toStage: { id: string; name: string },
  actorId: string,
) {
  await executor.insert(activities).values({
    type: "stage_change",
    subject: `Stage changed: ${fromStage.name} → ${toStage.name}`,
    occurredAt: new Date(),
    authorId: actorId,
    companyId: deal.companyId,
    contactId: deal.contactId,
    dealId: deal.id,
    listingId: deal.listingId,
    metadata: {
      fromStageId: fromStage.id,
      toStageId: toStage.id,
      fromStageName: fromStage.name,
      toStageName: toStage.name,
    },
  });
}

export async function createDeal(input: DealInput, actorId: string) {
  const { ownerId, stage, currency, propertyPrice, amount } = await validateDeal(
    input,
    actorId,
    null,
  );

  const [deal] = await db
    .insert(deals)
    .values({
      name: input.name,
      companyId: input.companyId,
      contactId: input.contactId,
      listingId: input.listingId,
      pipelineId: input.pipelineId,
      stageId: input.stageId,
      ownerId,
      propertyPrice: propertyPrice === null ? null : propertyPrice.toFixed(2),
      amount: amount.toFixed(2),
      currency,
      expectedCloseDate: input.expectedCloseDate,
      description: input.description,
      status: statusForOutcome(stage.outcome),
      closedAt: stage.outcome === "open" ? null : new Date(),
      lostReason: stage.outcome === "lost" ? input.lostReason : null,
      updatedAt: new Date(),
    })
    .returning();

  return deal;
}

export async function updateDeal(
  dealId: string,
  input: DealInput,
  actorId: string,
  expectedUpdatedAt?: string,
) {
  const existing = await getDeal(dealId);
  if (!existing) throw new AppError("Deal not found", "NOT_FOUND");

  const { ownerId, stage, currency, propertyPrice, amount } = await validateDeal(
    input,
    actorId,
    existing,
  );
  const stageChanged = existing.stageId !== input.stageId;

  return db.transaction(async (tx) => {
    const where = expectedUpdatedAt
      ? and(
          eq(deals.id, dealId),
          sql`date_trunc('milliseconds', ${deals.updatedAt}) = ${new Date(expectedUpdatedAt).toISOString()}::timestamptz`,
        )
      : eq(deals.id, dealId);

    const [deal] = await tx
      .update(deals)
      .set({
        name: input.name,
        companyId: input.companyId,
        contactId: input.contactId,
        listingId: input.listingId,
        pipelineId: input.pipelineId,
        stageId: input.stageId,
        ownerId,
        propertyPrice: propertyPrice === null ? null : propertyPrice.toFixed(2),
        amount: amount.toFixed(2),
        currency,
        expectedCloseDate: input.expectedCloseDate,
        description: input.description,
        status: statusForOutcome(stage.outcome),
        closedAt: stage.outcome === "open" ? null : (existing.closedAt ?? new Date()),
        lostReason: stage.outcome === "lost" ? input.lostReason : null,
        updatedAt: new Date(),
      })
      .where(where)
      .returning();

    if (!deal) {
      throw new AppError(
        "This deal changed since you loaded it. Refresh and try again.",
        "CONFLICT",
      );
    }

    if (stageChanged) {
      await insertStageChange(
        tx,
        deal,
        { id: existing.stageId, name: existing.stageName },
        { id: stage.id, name: stage.name },
        actorId,
      );
    }

    return deal;
  });
}

export async function moveDeal(
  input: {
    dealId: string;
    stageId: string;
    lostReason?: string | null;
    expectedUpdatedAt?: string;
  },
  actorId: string,
) {
  const existing = await getDeal(input.dealId);
  if (!existing) throw new AppError("Deal not found", "NOT_FOUND");

  const [stage] = await db.select().from(stages).where(eq(stages.id, input.stageId)).limit(1);
  if (!stage) throw new AppError("Stage not found", "NOT_FOUND");
  if (stage.pipelineId !== existing.pipelineId) {
    throw new AppError(
      "The selected stage does not belong to this deal's pipeline.",
      "STAGE_PIPELINE_MISMATCH",
    );
  }
  if (stage.outcome === "lost" && !input.lostReason) {
    throw new AppError("A lost reason is required for a lost deal.", "LOST_REASON_REQUIRED");
  }

  return db.transaction(async (tx) => {
    const where = input.expectedUpdatedAt
      ? and(
          eq(deals.id, input.dealId),
          sql`date_trunc('milliseconds', ${deals.updatedAt}) = ${new Date(input.expectedUpdatedAt).toISOString()}::timestamptz`,
        )
      : eq(deals.id, input.dealId);

    const [deal] = await tx
      .update(deals)
      .set({
        stageId: stage.id,
        status: statusForOutcome(stage.outcome),
        closedAt: stage.outcome === "open" ? null : (existing.closedAt ?? new Date()),
        lostReason: stage.outcome === "lost" ? input.lostReason : null,
        updatedAt: new Date(),
      })
      .where(where)
      .returning();

    if (!deal) {
      throw new AppError(
        "This deal changed since you loaded it. Refresh and try again.",
        "CONFLICT",
      );
    }

    await insertStageChange(
      tx,
      deal,
      { id: existing.stageId, name: existing.stageName },
      { id: stage.id, name: stage.name },
      actorId,
    );

    return deal;
  });
}

export const dealServiceInternals = { sql };
