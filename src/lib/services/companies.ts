import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  companies,
  companyTags,
  contacts,
  deals,
  listings,
  tags,
  tickets,
  users,
  type Company,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import { normalizeDomain, normalizeTags } from "@/lib/auth/normalize";
import { ensureTags } from "@/lib/services/tags";
import type { CompanyInput } from "@/lib/validation/company";
import type { z } from "zod";
import type { companyListParamsSchema } from "@/lib/validation/company";

type CompanyListParams = z.infer<typeof companyListParamsSchema>;

export type CompanyListItem = Company & {
  ownerName: string;
  ownerStatus: "active" | "inactive";
  tagNames: string[];
};

async function tagMapForCompanies(companyIds: string[]) {
  const map = new Map<string, string[]>();
  if (companyIds.length === 0) return map;
  const rows = await db
    .select({ companyId: companyTags.companyId, name: tags.name })
    .from(companyTags)
    .innerJoin(tags, eq(companyTags.tagId, tags.id))
    .where(inArray(companyTags.companyId, companyIds))
    .orderBy(asc(tags.name));

  for (const row of rows) {
    map.set(row.companyId, [...(map.get(row.companyId) ?? []), row.name]);
  }
  return map;
}

export async function listCompanies(params: CompanyListParams) {
  const conditions = [];

  if (params.archived === "active") conditions.push(isNull(companies.archivedAt));
  if (params.archived === "archived") conditions.push(isNotNull(companies.archivedAt));
  if (params.q) {
    const pattern = `%${params.q}%`;
    conditions.push(or(ilike(companies.name, pattern), ilike(companies.domain, pattern)));
  }
  if (params.ownerId) conditions.push(eq(companies.ownerId, params.ownerId));
  if (params.industry) conditions.push(ilike(companies.industry, `%${params.industry}%`));
  if (params.tag) {
    const tagNames = params.tag
      .split(",")
      .map((tag) => normalizeTags([tag])[0])
      .filter(Boolean);
    if (tagNames.length > 0) {
      conditions.push(
        exists(
          db
            .select({ one: sql`1` })
            .from(companyTags)
            .innerJoin(tags, eq(companyTags.tagId, tags.id))
            .where(and(eq(companyTags.companyId, companies.id), inArray(tags.name, tagNames))),
        ),
      );
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (params.page - 1) * params.pageSize;

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        company: companies,
        ownerName: users.name,
        ownerStatus: users.status,
      })
      .from(companies)
      .innerJoin(users, eq(companies.ownerId, users.id))
      .where(where)
      .orderBy(desc(companies.updatedAt))
      .limit(params.pageSize)
      .offset(offset),
    db.select({ count: count() }).from(companies).where(where),
  ]);

  const tagMap = await tagMapForCompanies(rows.map((row) => row.company.id));

  const items: CompanyListItem[] = rows.map((row) => ({
    ...row.company,
    ownerName: row.ownerName,
    ownerStatus: row.ownerStatus,
    tagNames: tagMap.get(row.company.id) ?? [],
  }));

  const total = Number(totalRow[0]?.count ?? 0);
  return {
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getCompany(companyId: string) {
  const [row] = await db
    .select({
      company: companies,
      ownerName: users.name,
      ownerEmail: users.email,
      ownerStatus: users.status,
    })
    .from(companies)
    .innerJoin(users, eq(companies.ownerId, users.id))
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!row) return null;

  const tagRows = await db
    .select({ name: tags.name })
    .from(companyTags)
    .innerJoin(tags, eq(companyTags.tagId, tags.id))
    .where(eq(companyTags.companyId, companyId))
    .orderBy(asc(tags.name));

  return {
    ...row.company,
    ownerName: row.ownerName,
    ownerEmail: row.ownerEmail,
    ownerStatus: row.ownerStatus,
    tagNames: tagRows.map((tag) => tag.name),
  };
}

export async function getCompanyRelations(companyId: string) {
  const [contactRows, listingRows, dealRows, ticketRows] = await Promise.all([
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        jobTitle: contacts.jobTitle,
        archivedAt: contacts.archivedAt,
      })
      .from(contacts)
      .where(and(eq(contacts.companyId, companyId), isNull(contacts.archivedAt)))
      .orderBy(asc(contacts.firstName))
      .limit(50),
    db
      .select({
        id: listings.id,
        reference: listings.reference,
        title: listings.title,
        transaction: listings.transaction,
        status: listings.status,
        price: listings.price,
        currency: listings.currency,
        sellerContactId: listings.sellerContactId,
        sellerFirstName: contacts.firstName,
        sellerLastName: contacts.lastName,
        sellerArchivedAt: contacts.archivedAt,
      })
      .from(listings)
      .innerJoin(contacts, eq(listings.sellerContactId, contacts.id))
      .where(eq(contacts.companyId, companyId))
      .orderBy(desc(listings.listedAt))
      .limit(50),
    db
      .select({
        id: deals.id,
        name: deals.name,
        amount: deals.amount,
        currency: deals.currency,
        status: deals.status,
        expectedCloseDate: deals.expectedCloseDate,
      })
      .from(deals)
      .where(eq(deals.companyId, companyId))
      .orderBy(desc(deals.updatedAt))
      .limit(50),
    db
      .select({
        id: tickets.id,
        subject: tickets.subject,
        status: tickets.status,
        priority: tickets.priority,
        requesterFirst: contacts.firstName,
        requesterLast: contacts.lastName,
      })
      .from(tickets)
      .innerJoin(contacts, eq(tickets.requesterContactId, contacts.id))
      .where(eq(contacts.companyId, companyId))
      .orderBy(desc(tickets.updatedAt))
      .limit(50),
  ]);

  return { contacts: contactRows, listings: listingRows, deals: dealRows, tickets: ticketRows };
}

async function assertActiveOwner(ownerId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, ownerId)).limit(1);
  if (!user) throw new AppError("Owner not found", "NOT_FOUND");
  if (user.status !== "active")
    throw new AppError("Choose an active team member as owner", "INACTIVE_OWNER");
  return user;
}

export async function createCompany(input: CompanyInput, actorId: string) {
  const ownerId = input.ownerId ?? actorId;
  await assertActiveOwner(ownerId);

  return db.transaction(async (tx) => {
    const [company] = await tx
      .insert(companies)
      .values({
        name: input.name,
        domain: input.domain,
        industry: input.industry,
        employeeCount: input.employeeCount,
        phone: input.phone,
        website: input.website,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        region: input.region,
        postalCode: input.postalCode,
        country: input.country,
        description: input.description,
        ownerId,
      })
      .returning();

    const tagRows = await ensureTags(tx, normalizeTags(input.tags));
    if (tagRows.length > 0) {
      await tx
        .insert(companyTags)
        .values(tagRows.map((tag) => ({ companyId: company.id, tagId: tag.id })))
        .onConflictDoNothing();
    }

    return company;
  });
}

export async function updateCompany(companyId: string, input: CompanyInput) {
  const existing = await getCompany(companyId);
  if (!existing) throw new AppError("Company not found", "NOT_FOUND");
  if (input.ownerId && input.ownerId !== existing.ownerId) await assertActiveOwner(input.ownerId);

  return db.transaction(async (tx) => {
    const [company] = await tx
      .update(companies)
      .set({
        name: input.name,
        domain: input.domain,
        industry: input.industry,
        employeeCount: input.employeeCount,
        phone: input.phone,
        website: input.website,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        region: input.region,
        postalCode: input.postalCode,
        country: input.country,
        description: input.description,
        ownerId: input.ownerId ?? existing.ownerId,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId))
      .returning();

    await tx.delete(companyTags).where(eq(companyTags.companyId, companyId));
    const tagRows = await ensureTags(tx, normalizeTags(input.tags));
    if (tagRows.length > 0) {
      await tx
        .insert(companyTags)
        .values(tagRows.map((tag) => ({ companyId, tagId: tag.id })))
        .onConflictDoNothing();
    }

    return company;
  });
}

export async function setCompanyArchived(companyId: string, archived: boolean) {
  const [company] = await db
    .update(companies)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(companies.id, companyId))
    .returning();
  if (!company) throw new AppError("Company not found", "NOT_FOUND");
  return company;
}

export async function getCompanyPickerOptions() {
  return db
    .select({
      id: companies.id,
      name: companies.name,
      domain: companies.domain,
      archivedAt: companies.archivedAt,
    })
    .from(companies)
    .where(isNull(companies.archivedAt))
    .orderBy(asc(companies.name))
    .limit(500);
}

export async function getCompanyFilterOptions() {
  const [ownerRows, industryRows, tagRows] = await Promise.all([
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.status, "active"))
      .orderBy(asc(users.name)),
    db
      .select({ industry: companies.industry })
      .from(companies)
      .where(and(isNull(companies.archivedAt), isNotNull(companies.industry)))
      .groupBy(companies.industry)
      .orderBy(asc(companies.industry)),
    db
      .select({ name: tags.name })
      .from(tags)
      .innerJoin(companyTags, eq(companyTags.tagId, tags.id))
      .groupBy(tags.name)
      .orderBy(asc(tags.name)),
  ]);

  return {
    owners: ownerRows,
    industries: industryRows
      .map((row) => row.industry)
      .filter((value): value is string => Boolean(value)),
    tags: tagRows.map((row) => row.name),
  };
}

export async function normalizeCompanyDomain(value: string | null | undefined) {
  return normalizeDomain(value);
}
