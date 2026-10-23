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
import type { z } from "zod";
import { db } from "@/db";
import {
  campaignRecipients,
  campaigns,
  companies,
  contactTags,
  contacts,
  deals,
  tags,
  tickets,
  users,
  type Contact,
} from "@/db/schema";
import { normalizeTags } from "@/lib/auth/normalize";
import { AppError } from "@/lib/errors";
import { ensureTags } from "@/lib/services/tags";
import type { ContactInput } from "@/lib/validation/contact";
import type { contactListParamsSchema } from "@/lib/validation/contact";

type ContactListParams = z.infer<typeof contactListParamsSchema>;

export type ContactListItem = Contact & {
  companyName: string | null;
  ownerName: string;
  ownerStatus: "active" | "inactive";
  tagNames: string[];
};

async function tagMapForContacts(contactIds: string[]) {
  const map = new Map<string, string[]>();
  if (contactIds.length === 0) return map;
  const rows = await db
    .select({ contactId: contactTags.contactId, name: tags.name })
    .from(contactTags)
    .innerJoin(tags, eq(contactTags.tagId, tags.id))
    .where(inArray(contactTags.contactId, contactIds))
    .orderBy(asc(tags.name));

  for (const row of rows) {
    map.set(row.contactId, [...(map.get(row.contactId) ?? []), row.name]);
  }
  return map;
}

export async function listContacts(params: ContactListParams) {
  const conditions = [];

  if (params.archived === "active") conditions.push(isNull(contacts.archivedAt));
  if (params.archived === "archived") conditions.push(isNotNull(contacts.archivedAt));
  if (params.q) {
    const pattern = `%${params.q}%`;
    conditions.push(
      or(
        ilike(contacts.firstName, pattern),
        ilike(contacts.lastName, pattern),
        ilike(contacts.email, pattern),
      ),
    );
  }
  if (params.ownerId) conditions.push(eq(contacts.ownerId, params.ownerId));
  if (params.companyId) conditions.push(eq(contacts.companyId, params.companyId));
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
            .from(contactTags)
            .innerJoin(tags, eq(contactTags.tagId, tags.id))
            .where(and(eq(contactTags.contactId, contacts.id), inArray(tags.name, tagNames))),
        ),
      );
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (params.page - 1) * params.pageSize;

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        contact: contacts,
        companyName: companies.name,
        ownerName: users.name,
        ownerStatus: users.status,
      })
      .from(contacts)
      .leftJoin(companies, eq(contacts.companyId, companies.id))
      .innerJoin(users, eq(contacts.ownerId, users.id))
      .where(where)
      .orderBy(desc(contacts.updatedAt))
      .limit(params.pageSize)
      .offset(offset),
    db.select({ count: count() }).from(contacts).where(where),
  ]);

  const tagMap = await tagMapForContacts(rows.map((row) => row.contact.id));

  const items: ContactListItem[] = rows.map((row) => ({
    ...row.contact,
    companyName: row.companyName,
    ownerName: row.ownerName,
    ownerStatus: row.ownerStatus,
    tagNames: tagMap.get(row.contact.id) ?? [],
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

export async function getContact(contactId: string) {
  const [row] = await db
    .select({
      contact: contacts,
      companyName: companies.name,
      companyArchivedAt: companies.archivedAt,
      ownerName: users.name,
      ownerEmail: users.email,
      ownerStatus: users.status,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .innerJoin(users, eq(contacts.ownerId, users.id))
    .where(eq(contacts.id, contactId))
    .limit(1);

  if (!row) return null;

  const tagRows = await db
    .select({ name: tags.name })
    .from(contactTags)
    .innerJoin(tags, eq(contactTags.tagId, tags.id))
    .where(eq(contactTags.contactId, contactId))
    .orderBy(asc(tags.name));

  return {
    ...row.contact,
    companyName: row.companyName,
    companyArchivedAt: row.companyArchivedAt,
    ownerName: row.ownerName,
    ownerEmail: row.ownerEmail,
    ownerStatus: row.ownerStatus,
    tagNames: tagRows.map((tag) => tag.name),
  };
}

export async function getContactRelations(contactId: string) {
  const [dealRows, ticketRows, campaignRows] = await Promise.all([
    db
      .select({
        id: deals.id,
        name: deals.name,
        amount: deals.amount,
        status: deals.status,
        expectedCloseDate: deals.expectedCloseDate,
      })
      .from(deals)
      .where(eq(deals.contactId, contactId))
      .orderBy(desc(deals.updatedAt))
      .limit(50),
    db
      .select({
        id: tickets.id,
        subject: tickets.subject,
        status: tickets.status,
        priority: tickets.priority,
      })
      .from(tickets)
      .where(eq(tickets.requesterContactId, contactId))
      .orderBy(desc(tickets.updatedAt))
      .limit(50),
    db
      .select({
        campaignId: campaigns.id,
        campaignName: campaigns.name,
        campaignStatus: campaigns.status,
        recipientStatus: campaignRecipients.status,
        statusUpdatedAt: campaignRecipients.statusUpdatedAt,
      })
      .from(campaignRecipients)
      .innerJoin(campaigns, eq(campaignRecipients.campaignId, campaigns.id))
      .where(eq(campaignRecipients.contactId, contactId))
      .orderBy(desc(campaignRecipients.statusUpdatedAt))
      .limit(50),
  ]);

  return { deals: dealRows, tickets: ticketRows, campaigns: campaignRows };
}

async function assertActiveOwner(ownerId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, ownerId)).limit(1);
  if (!user) throw new AppError("Owner not found", "NOT_FOUND");
  if (user.status !== "active") throw new AppError("Choose an active team member as owner", "INACTIVE_OWNER");
  return user;
}

async function assertAvailableCompany(companyId: string, currentCompanyId?: string | null) {
  if (companyId === currentCompanyId) return;
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company) throw new AppError("Company not found", "NOT_FOUND");
  if (company.archivedAt) throw new AppError("Choose an active company", "ARCHIVED_COMPANY");
}

async function assertUniqueEmail(email: string, currentContactId?: string) {
  const [duplicate] = await db
    .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName })
    .from(contacts)
    .where(sql`lower(${contacts.email}) = ${email}`)
    .limit(1);
  if (duplicate && duplicate.id !== currentContactId) {
    throw new AppError(
      `That email already belongs to ${duplicate.firstName} ${duplicate.lastName}.`,
      "DUPLICATE_EMAIL",
    );
  }
}

export async function createContact(input: ContactInput, actorId: string) {
  const ownerId = input.ownerId ?? actorId;
  await assertActiveOwner(ownerId);
  if (input.companyId) await assertAvailableCompany(input.companyId);
  await assertUniqueEmail(input.email);

  return db.transaction(async (tx) => {
    const [contact] = await tx
      .insert(contacts)
      .values({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        jobTitle: input.jobTitle,
        companyId: input.companyId,
        ownerId,
        notes: input.notes,
      })
      .returning();

    const tagRows = await ensureTags(tx, normalizeTags(input.tags));
    if (tagRows.length > 0) {
      await tx
        .insert(contactTags)
        .values(tagRows.map((tag) => ({ contactId: contact.id, tagId: tag.id })))
        .onConflictDoNothing();
    }

    return contact;
  });
}

export async function updateContact(contactId: string, input: ContactInput) {
  const existing = await getContact(contactId);
  if (!existing) throw new AppError("Contact not found", "NOT_FOUND");
  if (input.ownerId && input.ownerId !== existing.ownerId) await assertActiveOwner(input.ownerId);
  if (input.companyId) await assertAvailableCompany(input.companyId, existing.companyId);
  await assertUniqueEmail(input.email, contactId);

  return db.transaction(async (tx) => {
    const [contact] = await tx
      .update(contacts)
      .set({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        jobTitle: input.jobTitle,
        companyId: input.companyId,
        ownerId: input.ownerId ?? existing.ownerId,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, contactId))
      .returning();

    await tx.delete(contactTags).where(eq(contactTags.contactId, contactId));
    const tagRows = await ensureTags(tx, normalizeTags(input.tags));
    if (tagRows.length > 0) {
      await tx
        .insert(contactTags)
        .values(tagRows.map((tag) => ({ contactId, tagId: tag.id })))
        .onConflictDoNothing();
    }

    return contact;
  });
}

export async function setContactArchived(contactId: string, archived: boolean) {
  const [contact] = await db
    .update(contacts)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(contacts.id, contactId))
    .returning();
  if (!contact) throw new AppError("Contact not found", "NOT_FOUND");
  return contact;
}

export async function getContactPickerOptions() {
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
    .where(isNull(contacts.archivedAt))
    .orderBy(asc(contacts.firstName), asc(contacts.lastName))
    .limit(1000);
}

export async function getContactFilterOptions() {
  const [ownerRows, companyRows, tagRows] = await Promise.all([
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.status, "active"))
      .orderBy(asc(users.name)),
    db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(isNull(companies.archivedAt))
      .orderBy(asc(companies.name)),
    db
      .select({ name: tags.name })
      .from(tags)
      .innerJoin(contactTags, eq(contactTags.tagId, tags.id))
      .groupBy(tags.name)
      .orderBy(asc(tags.name)),
  ]);

  return {
    owners: ownerRows,
    companies: companyRows,
    tags: tagRows.map((row) => row.name),
  };
}
