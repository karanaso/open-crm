import { and, asc, count, desc, eq, exists, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import {
  campaigns,
  campaignRecipients,
  companies,
  contactTags,
  contacts,
  segments,
  tags,
  users,
  type Campaign,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import { campaignMetrics } from "@/lib/metrics";
import type { SegmentCriteria, CampaignSegmentSnapshot } from "@/lib/types";
import type { CampaignInput, SegmentInput } from "@/lib/validation/marketing";
import type { campaignListParamsSchema } from "@/lib/validation/marketing";

type CampaignListParams = z.infer<typeof campaignListParamsSchema>;

export function segmentWhere(criteria: SegmentCriteria) {
  const conditions = [isNull(contacts.archivedAt)];

  if (criteria.tags && criteria.tags.length > 0) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(contactTags)
          .innerJoin(tags, eq(contactTags.tagId, tags.id))
          .where(and(eq(contactTags.contactId, contacts.id), inArray(tags.name, criteria.tags))),
      ),
    );
  }
  if (criteria.industry) conditions.push(eq(companies.industry, criteria.industry));
  if (criteria.jobTitle) conditions.push(ilike(contacts.jobTitle, `%${criteria.jobTitle}%`));
  if (criteria.ownerId) conditions.push(eq(contacts.ownerId, criteria.ownerId));
  if (criteria.createdFrom) {
    conditions.push(gte(contacts.createdAt, new Date(`${criteria.createdFrom}T00:00:00.000Z`)));
  }
  if (criteria.createdTo) {
    conditions.push(lte(contacts.createdAt, new Date(`${criteria.createdTo}T23:59:59.999Z`)));
  }

  return and(...conditions);
}

export async function countSegmentAudience(criteria: SegmentCriteria) {
  const [row] = await db
    .select({ count: count() })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(segmentWhere(criteria));
  return Number(row?.count ?? 0);
}

export async function getSegmentAudience(criteria: SegmentCriteria) {
  return db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      companyId: contacts.companyId,
      companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(segmentWhere(criteria))
    .orderBy(asc(contacts.firstName), asc(contacts.lastName))
    .limit(5000);
}

export async function listSegments(includeArchived = false) {
  const rows = await db
    .select()
    .from(segments)
    .where(includeArchived ? undefined : isNull(segments.archivedAt))
    .orderBy(desc(segments.updatedAt));

  return Promise.all(
    rows.map(async (segment) => ({
      ...segment,
      audienceCount: await countSegmentAudience(segment.criteria),
    })),
  );
}

export async function getSegment(segmentId: string) {
  const [row] = await db
    .select({ segment: segments, creatorName: users.name })
    .from(segments)
    .innerJoin(users, eq(segments.createdById, users.id))
    .where(eq(segments.id, segmentId))
    .limit(1);
  if (!row) return null;
  return {
    ...row.segment,
    creatorName: row.creatorName,
    audienceCount: await countSegmentAudience(row.segment.criteria),
  };
}

export async function getSegmentOptions() {
  const rows = await db
    .select()
    .from(segments)
    .where(isNull(segments.archivedAt))
    .orderBy(asc(segments.name));
  return Promise.all(
    rows.map(async (segment) => ({
      ...segment,
      audienceCount: await countSegmentAudience(segment.criteria),
    })),
  );
}

export async function createSegment(input: SegmentInput, actorId: string) {
  const [segment] = await db
    .insert(segments)
    .values({
      name: input.name,
      description: input.description,
      criteria: input.criteria,
      createdById: actorId,
    })
    .returning();
  return segment;
}

export async function updateSegment(segmentId: string, input: SegmentInput) {
  const [segment] = await db
    .update(segments)
    .set({
      name: input.name,
      description: input.description,
      criteria: input.criteria,
      updatedAt: new Date(),
    })
    .where(eq(segments.id, segmentId))
    .returning();
  if (!segment) throw new AppError("Segment not found", "NOT_FOUND");
  return segment;
}

export async function archiveSegment(segmentId: string, archived: boolean) {
  const [segment] = await db
    .update(segments)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(segments.id, segmentId))
    .returning();
  if (!segment) throw new AppError("Segment not found", "NOT_FOUND");
  return segment;
}

export async function listCampaigns(params: CampaignListParams) {
  const conditions = [];
  if (params.q) conditions.push(ilike(campaigns.name, `%${params.q}%`));
  if (params.status) conditions.push(eq(campaigns.status, params.status));
  if (params.channel) conditions.push(eq(campaigns.channel, params.channel));
  if (params.ownerId) conditions.push(eq(campaigns.ownerId, params.ownerId));
  const where = conditions.length ? and(...conditions) : undefined;

  const orderBy =
    params.sort === "name"
      ? asc(campaigns.name)
      : params.sort === "start_date"
        ? desc(campaigns.startDate)
        : desc(campaigns.updatedAt);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        campaign: campaigns,
        segmentName: segments.name,
        ownerName: users.name,
        ownerStatus: users.status,
        audienceCount: sql<number>`(select count(*)::int from campaign_recipients cr where cr.campaign_id = ${campaigns.id})`,
      })
      .from(campaigns)
      .innerJoin(segments, eq(campaigns.segmentId, segments.id))
      .innerJoin(users, eq(campaigns.ownerId, users.id))
      .where(where)
      .orderBy(orderBy)
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ count: count() }).from(campaigns).where(where),
  ]);

  const total = Number(totalRow[0]?.count ?? 0);
  return {
    items: rows.map((row) => ({
      ...row.campaign,
      segmentName: row.segmentName,
      ownerName: row.ownerName,
      ownerStatus: row.ownerStatus,
      audienceCount: Number(row.audienceCount ?? 0),
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getCampaign(campaignId: string) {
  const [row] = await db
    .select({
      campaign: campaigns,
      segmentName: segments.name,
      ownerName: users.name,
      ownerStatus: users.status,
    })
    .from(campaigns)
    .innerJoin(segments, eq(campaigns.segmentId, segments.id))
    .innerJoin(users, eq(campaigns.ownerId, users.id))
    .where(eq(campaigns.id, campaignId))
    .limit(1);
  if (!row) return null;

  const recipients = await getCampaignRecipients(campaignId);
  const metrics = campaignMetrics(recipients);
  return {
    ...row.campaign,
    segmentName: row.segmentName,
    ownerName: row.ownerName,
    ownerStatus: row.ownerStatus,
    recipients,
    metrics,
  };
}

export async function getCampaignRecipients(campaignId: string) {
  return db
    .select({
      recipient: campaignRecipients,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      updatedByName: users.name,
    })
    .from(campaignRecipients)
    .innerJoin(contacts, eq(campaignRecipients.contactId, contacts.id))
    .leftJoin(users, eq(campaignRecipients.statusUpdatedById, users.id))
    .where(eq(campaignRecipients.campaignId, campaignId))
    .orderBy(asc(contacts.firstName), asc(contacts.lastName));
}

export { campaignMetrics };

async function validateCampaign(input: CampaignInput, actorId: string, existing?: Campaign | null) {
  const ownerId = input.ownerId ?? existing?.ownerId ?? actorId;
  const [owner] = await db.select().from(users).where(eq(users.id, ownerId)).limit(1);
  if (!owner) throw new AppError("Owner not found", "NOT_FOUND");
  if (owner.status !== "active" && ownerId !== existing?.ownerId) {
    throw new AppError("Choose an active team member as owner", "INACTIVE_OWNER");
  }
  const [segment] = await db.select().from(segments).where(eq(segments.id, input.segmentId)).limit(1);
  if (!segment) throw new AppError("Segment not found", "NOT_FOUND");
  if (segment.archivedAt && !existing) throw new AppError("Choose an active segment", "ARCHIVED_SEGMENT");
  return { ownerId };
}

export async function createCampaign(input: CampaignInput, actorId: string) {
  const { ownerId } = await validateCampaign(input, actorId, null);
  const [campaign] = await db
    .insert(campaigns)
    .values({
      name: input.name,
      channel: input.channel,
      status: "draft",
      segmentId: input.segmentId,
      ownerId,
      budget: input.budget.toFixed(2),
      startDate: input.startDate,
      endDate: input.endDate,
      description: input.description,
      updatedAt: new Date(),
    })
    .returning();
  return campaign;
}

export async function updateCampaign(campaignId: string, input: CampaignInput) {
  const existing = await getCampaign(campaignId);
  if (!existing) throw new AppError("Campaign not found", "NOT_FOUND");
  if (existing.status === "archived") throw new AppError("Archived campaigns are read-only.", "ARCHIVED_CAMPAIGN");
  const { ownerId } = await validateCampaign(input, existing.ownerId, existing);

  const [campaign] = await db
    .update(campaigns)
    .set({
      name: input.name,
      channel: input.channel,
      segmentId: input.segmentId,
      ownerId,
      budget: input.budget.toFixed(2),
      startDate: input.startDate,
      endDate: input.endDate,
      description: input.description,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId))
    .returning();
  return campaign;
}

export async function activateCampaign(campaignId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const [campaign] = await tx
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1)
      .for("update");
    if (!campaign) throw new AppError("Campaign not found", "NOT_FOUND");
    if (campaign.status !== "draft") {
      throw new AppError("Only draft campaigns can be activated.", "INVALID_TRANSITION");
    }

    const [segment] = await tx.select().from(segments).where(eq(segments.id, campaign.segmentId)).limit(1);
    if (!segment) throw new AppError("Segment not found", "NOT_FOUND");

    const audience = await getSegmentAudience(segment.criteria);
    if (audience.length === 0) {
      throw new AppError("This segment has no matching contacts. Add contacts before activating.", "EMPTY_AUDIENCE");
    }

    const snapshot: CampaignSegmentSnapshot = {
      name: segment.name,
      criteria: segment.criteria,
    };

    const [updated] = await tx
      .update(campaigns)
      .set({
        status: "active",
        activatedAt: new Date(),
        segmentSnapshot: snapshot,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId))
      .returning();

    await tx
      .insert(campaignRecipients)
      .values(
        audience.map((contact) => ({
          campaignId,
          contactId: contact.id,
          status: "targeted" as const,
          statusUpdatedById: actorId,
        })),
      )
      .onConflictDoNothing();

    return updated;
  });
}

export async function transitionCampaign(campaignId: string, target: Campaign["status"], actorId: string) {
  const existing = await getCampaign(campaignId);
  if (!existing) throw new AppError("Campaign not found", "NOT_FOUND");
  if (existing.status === "archived") throw new AppError("Archived campaigns are read-only.", "ARCHIVED_CAMPAIGN");

  if (target === "active") return activateCampaign(campaignId, actorId);

  const allowed: Record<Campaign["status"], Campaign["status"][]> = {
    draft: ["archived"],
    active: ["completed", "archived"],
    completed: ["archived"],
    archived: [],
  };
  if (!allowed[existing.status].includes(target)) {
    throw new AppError(`A ${existing.status} campaign cannot move to ${target}.`, "INVALID_TRANSITION");
  }

  const [campaign] = await db
    .update(campaigns)
    .set({
      status: target,
      completedAt: target === "completed" ? new Date() : existing.completedAt,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId))
    .returning();
  return campaign;
}

export async function updateRecipientStatus(
  recipientId: string,
  status: (typeof campaignRecipients.status.enumValues)[number],
  actorId: string,
) {
  const [row] = await db
    .select({ recipient: campaignRecipients, campaignStatus: campaigns.status })
    .from(campaignRecipients)
    .innerJoin(campaigns, eq(campaignRecipients.campaignId, campaigns.id))
    .where(eq(campaignRecipients.id, recipientId))
    .limit(1);
  if (!row) throw new AppError("Campaign recipient not found", "NOT_FOUND");
  if (row.campaignStatus === "archived") {
    throw new AppError("Archived campaigns are read-only.", "ARCHIVED_CAMPAIGN");
  }

  const [updated] = await db
    .update(campaignRecipients)
    .set({ status, statusUpdatedAt: new Date(), statusUpdatedById: actorId })
    .where(eq(campaignRecipients.id, recipientId))
    .returning();
  return updated;
}

export const marketingServiceInternals = { or, sql };
