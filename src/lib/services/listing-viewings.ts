import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  contacts,
  listingViewings,
  listings,
  users,
  type ListingViewing,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import type { ViewingInput, ViewingStatus } from "@/lib/validation/listing-viewing";

export type ViewingListItem = ListingViewing & {
  contactName: string;
  contactEmail: string;
  agentName: string | null;
  agentStatus: "active" | "inactive" | null;
};

export type ContactViewingItem = ViewingListItem & {
  listingReference: string;
  listingTitle: string;
  listingStatus: "active" | "inactive";
};

type ViewingRow = {
  viewing: ListingViewing;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  agentName: string | null;
  agentStatus: "active" | "inactive" | null;
};

function toViewingItem(row: ViewingRow): ViewingListItem {
  return {
    ...row.viewing,
    contactName: `${row.contactFirstName} ${row.contactLastName}`.trim(),
    contactEmail: row.contactEmail,
    agentName: row.agentName,
    agentStatus: row.agentStatus,
  };
}

const viewingSelection = {
  viewing: listingViewings,
  contactFirstName: contacts.firstName,
  contactLastName: contacts.lastName,
  contactEmail: contacts.email,
  agentName: users.name,
  agentStatus: users.status,
} as const;

export async function listListingViewings(listingId: string, now = new Date()) {
  const [listing] = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!listing) throw new AppError("Listing not found", "NOT_FOUND");

  const rows = await db
    .select(viewingSelection)
    .from(listingViewings)
    .innerJoin(contacts, eq(listingViewings.contactId, contacts.id))
    .leftJoin(users, eq(listingViewings.agentId, users.id))
    .where(eq(listingViewings.listingId, listingId))
    .orderBy(asc(listingViewings.scheduledAt));

  const items = rows.map(toViewingItem);
  const isUpcoming = (item: ViewingListItem) =>
    item.status === "scheduled" && item.scheduledAt.getTime() >= now.getTime();
  const upcoming = items
    .filter(isUpcoming)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  const past = items
    .filter((item) => !isUpcoming(item))
    .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());

  return { items, upcoming, past };
}

export async function listContactViewings(contactId: string): Promise<ContactViewingItem[]> {
  const rows = await db
    .select({
      ...viewingSelection,
      listingReference: listings.reference,
      listingTitle: listings.title,
      listingStatus: listings.status,
    })
    .from(listingViewings)
    .innerJoin(contacts, eq(listingViewings.contactId, contacts.id))
    .innerJoin(listings, eq(listingViewings.listingId, listings.id))
    .leftJoin(users, eq(listingViewings.agentId, users.id))
    .where(eq(listingViewings.contactId, contactId))
    .orderBy(desc(listingViewings.scheduledAt));

  return rows.map((row) => ({
    ...toViewingItem(row),
    listingReference: row.listingReference,
    listingTitle: row.listingTitle,
    listingStatus: row.listingStatus,
  }));
}

async function assertViewingReferences(input: ViewingInput, actorId: string) {
  const [[listing], [contact]] = await Promise.all([
    db.select({ id: listings.id }).from(listings).where(eq(listings.id, input.listingId)).limit(1),
    db.select({ id: contacts.id }).from(contacts).where(eq(contacts.id, input.contactId)).limit(1),
  ]);
  if (!listing) throw new AppError("Listing not found", "NOT_FOUND");
  if (!contact) throw new AppError("Contact not found", "NOT_FOUND");

  const agentId = input.agentId ?? actorId;
  const [agent] = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(eq(users.id, agentId))
    .limit(1);
  if (!agent) throw new AppError("Agent not found", "NOT_FOUND");
  if (agent.status !== "active") {
    throw new AppError("Choose an active team member as agent.", "INACTIVE_ASSIGNEE");
  }
  return { agentId };
}

export async function createViewing(input: ViewingInput, actorId: string) {
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new AppError("Enter a valid viewing time.", "INVALID_TIME");
  }
  const { agentId } = await assertViewingReferences(input, actorId);

  const [viewing] = await db
    .insert(listingViewings)
    .values({
      listingId: input.listingId,
      contactId: input.contactId,
      agentId,
      scheduledAt,
      durationMinutes: input.durationMinutes,
      status: input.status,
      notes: input.notes,
      createdById: actorId,
      updatedAt: new Date(),
    })
    .returning();
  return viewing;
}

export async function updateViewingStatus(viewingId: string, status: ViewingStatus) {
  const [viewing] = await db
    .update(listingViewings)
    .set({ status, updatedAt: new Date() })
    .where(eq(listingViewings.id, viewingId))
    .returning();
  if (!viewing) throw new AppError("Viewing not found", "NOT_FOUND");
  return viewing;
}
