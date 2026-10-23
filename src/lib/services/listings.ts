import { and, asc, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import {
  contacts,
  deals,
  listingPhotos,
  listings,
  users,
  type Listing,
  type ListingPhoto,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import { isListingFeatureKey } from "@/lib/listing-features";
import type { ListingInput } from "@/lib/validation/listing";
import type { listingListParamsSchema } from "@/lib/validation/listing";

type ListingListParams = z.infer<typeof listingListParamsSchema>;

export type ListingListItem = Listing & {
  sellerName: string;
  sellerEmail: string;
  sellerArchivedAt: Date | null;
  ownerName: string;
  ownerStatus: "active" | "inactive";
};

export type ListingDealSummary = {
  id: string;
  name: string;
  status: "open" | "won" | "lost";
  amount: string;
  propertyPrice: string | null;
  currency: string;
  contactName: string | null;
};

export type ListingDetail = ListingListItem & {
  photos: ListingPhoto[];
  deals: ListingDealSummary[];
};

const sellerColumns = {
  sellerFirstName: contacts.firstName,
  sellerLastName: contacts.lastName,
  sellerEmail: contacts.email,
  sellerArchivedAt: contacts.archivedAt,
} as const;

type SellerRow = {
  sellerFirstName: string;
  sellerLastName: string;
  sellerEmail: string;
  sellerArchivedAt: Date | null;
};

function sellerName(row: Pick<SellerRow, "sellerFirstName" | "sellerLastName">) {
  return `${row.sellerFirstName} ${row.sellerLastName}`.trim();
}

function toListingItem(
  listing: Listing,
  row: SellerRow & { ownerName: string; ownerStatus: "active" | "inactive" },
): ListingListItem {
  return {
    ...listing,
    sellerName: sellerName(row),
    sellerEmail: row.sellerEmail,
    sellerArchivedAt: row.sellerArchivedAt,
    ownerName: row.ownerName,
    ownerStatus: row.ownerStatus,
  };
}

function decimal(value: number | null | undefined, places: number) {
  return value === null || value === undefined ? null : value.toFixed(places);
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ((error as { code?: unknown }).code === "23505") return true;
  const cause = (error as { cause?: unknown }).cause;
  return cause instanceof Error || typeof cause === "object" ? isUniqueViolation(cause) : false;
}

function referenceConflict(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new AppError("A listing with this reference already exists.", "CONFLICT");
  }
  throw error;
}

async function assertSellerContact(sellerContactId: string, existingSellerContactId?: string) {
  const [seller] = await db
    .select({ id: contacts.id, archivedAt: contacts.archivedAt })
    .from(contacts)
    .where(eq(contacts.id, sellerContactId))
    .limit(1);
  if (!seller) throw new AppError("Seller contact not found", "NOT_FOUND");
  if (seller.archivedAt && sellerContactId !== existingSellerContactId) {
    throw new AppError("Choose an active seller contact.", "BAD_REQUEST");
  }
}

async function assertResponsibleAgent(agentId: string, existingAgentId?: string) {
  const [agent] = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(eq(users.id, agentId))
    .limit(1);
  if (!agent) throw new AppError("Agent not found", "NOT_FOUND");
  if (agent.status !== "active" && agentId !== existingAgentId) {
    throw new AppError("Choose an active team member as agent.", "INACTIVE_ASSIGNEE");
  }
}

export function listingFeatureFilterTree(features: string[]) {
  const tree: Record<string, Record<string, boolean>> = {};
  for (const feature of features) {
    if (!isListingFeatureKey(feature)) {
      throw new AppError("Choose valid feature filters.", "BAD_REQUEST");
    }
    const [group, key] = feature.split(".");
    tree[group] = { ...tree[group], [key]: true };
  }
  return tree;
}

export async function listListings(params: ListingListParams) {
  const conditions = [];

  const status = params.status ?? "active";
  if (status !== "all") conditions.push(eq(listings.status, status));
  if (params.q) {
    const pattern = `%${params.q}%`;
    conditions.push(
      or(
        ilike(listings.reference, pattern),
        ilike(listings.title, pattern),
        ilike(listings.addressLine1, pattern),
        ilike(listings.city, pattern),
        ilike(contacts.firstName, pattern),
        ilike(contacts.lastName, pattern),
        sql`(${contacts.firstName} || ' ' || ${contacts.lastName}) ilike ${pattern}`,
      ),
    );
  }
  if (params.transaction) conditions.push(eq(listings.transaction, params.transaction));
  if (params.propertyType) conditions.push(eq(listings.propertyType, params.propertyType));
  if (params.city) conditions.push(ilike(listings.city, `%${params.city}%`));
  if (params.bedrooms !== undefined) conditions.push(gte(listings.bedrooms, params.bedrooms));
  if (params.currency) conditions.push(eq(listings.currency, params.currency));

  const hasPriceRange = params.minPrice !== undefined || params.maxPrice !== undefined;
  const priceSort = params.sort === "price_asc" || params.sort === "price_desc";
  if ((hasPriceRange || priceSort) && !params.currency) {
    throw new AppError("Choose a currency to filter or sort by price.", "BAD_REQUEST");
  }
  if (params.minPrice !== undefined) {
    conditions.push(gte(listings.price, params.minPrice.toFixed(2)));
  }
  if (params.maxPrice !== undefined) {
    conditions.push(lte(listings.price, params.maxPrice.toFixed(2)));
  }
  if (params.features.length > 0) {
    const tree = listingFeatureFilterTree(params.features);
    conditions.push(sql`${listings.features} @> ${JSON.stringify(tree)}::jsonb`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const orderBy =
    params.sort === "price_asc"
      ? asc(listings.price)
      : params.sort === "price_desc"
        ? desc(listings.price)
        : params.sort === "listed_at"
          ? desc(listings.listedAt)
          : desc(listings.updatedAt);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        listing: listings,
        ...sellerColumns,
        ownerName: users.name,
        ownerStatus: users.status,
      })
      .from(listings)
      .innerJoin(contacts, eq(listings.sellerContactId, contacts.id))
      .innerJoin(users, eq(listings.ownerId, users.id))
      .where(where)
      .orderBy(orderBy)
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db
      .select({ count: count() })
      .from(listings)
      .innerJoin(contacts, eq(listings.sellerContactId, contacts.id))
      .where(where),
  ]);

  const total = Number(totalRow[0]?.count ?? 0);
  return {
    items: rows.map((row) =>
      toListingItem(row.listing, {
        sellerFirstName: row.sellerFirstName,
        sellerLastName: row.sellerLastName,
        sellerEmail: row.sellerEmail,
        sellerArchivedAt: row.sellerArchivedAt,
        ownerName: row.ownerName,
        ownerStatus: row.ownerStatus,
      }),
    ),
    total,
    page: params.page,
    pageSize: params.pageSize,
    pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getListing(listingId: string): Promise<ListingDetail | null> {
  const [row] = await db
    .select({
      listing: listings,
      ...sellerColumns,
      ownerName: users.name,
      ownerStatus: users.status,
    })
    .from(listings)
    .innerJoin(contacts, eq(listings.sellerContactId, contacts.id))
    .innerJoin(users, eq(listings.ownerId, users.id))
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!row) return null;

  const [photos, dealRows] = await Promise.all([
    db
      .select()
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, listingId))
      .orderBy(asc(listingPhotos.position)),
    db
      .select({
        id: deals.id,
        name: deals.name,
        status: deals.status,
        amount: deals.amount,
        propertyPrice: deals.propertyPrice,
        currency: deals.currency,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
      })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .where(eq(deals.listingId, listingId))
      .orderBy(desc(deals.updatedAt)),
  ]);

  return {
    ...toListingItem(row.listing, {
      sellerFirstName: row.sellerFirstName,
      sellerLastName: row.sellerLastName,
      sellerEmail: row.sellerEmail,
      sellerArchivedAt: row.sellerArchivedAt,
      ownerName: row.ownerName,
      ownerStatus: row.ownerStatus,
    }),
    photos,
    deals: dealRows.map((deal) => ({
      id: deal.id,
      name: deal.name,
      status: deal.status,
      amount: deal.amount,
      propertyPrice: deal.propertyPrice,
      currency: deal.currency,
      contactName:
        deal.contactFirstName && deal.contactLastName
          ? `${deal.contactFirstName} ${deal.contactLastName}`.trim()
          : deal.contactFirstName ?? null,
    })),
  };
}

export async function getListingOptions() {
  return db
    .select({
      id: listings.id,
      reference: listings.reference,
      title: listings.title,
      transaction: listings.transaction,
      price: listings.price,
      pricePeriod: listings.pricePeriod,
      commissionAmount: listings.commissionAmount,
      currency: listings.currency,
    })
    .from(listings)
    .where(eq(listings.status, "active"))
    .orderBy(asc(listings.reference))
    .limit(500);
}

export async function createListing(input: ListingInput, actorId: string) {
  const ownerId = input.ownerId ?? actorId;
  await assertSellerContact(input.sellerContactId);
  await assertResponsibleAgent(ownerId);

  const now = new Date();
  try {
    const [listing] = await db
      .insert(listings)
      .values({
        reference: input.reference,
        title: input.title,
        description: input.description,
        transaction: input.transaction,
        status: "active",
        price: input.price.toFixed(2),
        pricePeriod: input.transaction === "rent" ? "month" : null,
        commissionAmount: input.commissionAmount.toFixed(2),
        currency: input.currency,
        addressLine1: input.addressLine1,
        city: input.city,
        region: input.region,
        postalCode: input.postalCode,
        country: input.country,
        propertyType: input.propertyType,
        bedrooms: input.bedrooms,
        bathrooms: decimal(input.bathrooms, 1),
        sizeSqm: decimal(input.sizeSqm, 2),
        lotSqm: decimal(input.lotSqm, 2),
        yearBuilt: input.yearBuilt,
        floors: input.floors,
        parking: input.parking,
        energyClass: input.energyClass,
        sellerContactId: input.sellerContactId,
        ownerId,
        features: input.features,
        listedAt: now,
        deactivatedAt: null,
        updatedAt: now,
      })
      .returning();
    return listing;
  } catch (error) {
    return referenceConflict(error);
  }
}

export async function updateListing(listingId: string, input: ListingInput) {
  const [existing] = await db
    .select({
      id: listings.id,
      ownerId: listings.ownerId,
      sellerContactId: listings.sellerContactId,
    })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!existing) throw new AppError("Listing not found", "NOT_FOUND");

  await assertSellerContact(input.sellerContactId, existing.sellerContactId);
  const ownerId = input.ownerId ?? existing.ownerId;
  await assertResponsibleAgent(ownerId, existing.ownerId);

  try {
    const [listing] = await db
      .update(listings)
      .set({
        reference: input.reference,
        title: input.title,
        description: input.description,
        transaction: input.transaction,
        price: input.price.toFixed(2),
        pricePeriod: input.transaction === "rent" ? "month" : null,
        commissionAmount: input.commissionAmount.toFixed(2),
        currency: input.currency,
        addressLine1: input.addressLine1,
        city: input.city,
        region: input.region,
        postalCode: input.postalCode,
        country: input.country,
        propertyType: input.propertyType,
        bedrooms: input.bedrooms,
        bathrooms: decimal(input.bathrooms, 1),
        sizeSqm: decimal(input.sizeSqm, 2),
        lotSqm: decimal(input.lotSqm, 2),
        yearBuilt: input.yearBuilt,
        floors: input.floors,
        parking: input.parking,
        energyClass: input.energyClass,
        sellerContactId: input.sellerContactId,
        ownerId,
        features: input.features,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listingId))
      .returning();
    return listing;
  } catch (error) {
    return referenceConflict(error);
  }
}

export async function setListingStatus(listingId: string, status: Listing["status"]) {
  const now = new Date();
  const [listing] = await db
    .update(listings)
    .set({
      status,
      deactivatedAt: status === "inactive" ? now : null,
      updatedAt: now,
    })
    .where(eq(listings.id, listingId))
    .returning();
  if (!listing) throw new AppError("Listing not found", "NOT_FOUND");
  return listing;
}
