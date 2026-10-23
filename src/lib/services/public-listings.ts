import { and, asc, count, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { listingPhotos, listings, type ListingFeatures } from "@/db/schema";
import { appUrl } from "@/lib/env";
import { isListingFeatureKey } from "@/lib/listing-features";
import type { EnergyClass, PropertyType } from "@/lib/validation/listing";
import { listingPhotoPublicPath } from "@/lib/validation/listing-photo";
import type { PublicListingsQuery } from "@/lib/validation/public-listings";

export type PublicListingPhoto = {
  id: string;
  url: string;
  alt: string | null;
  position: number;
  width: number | null;
  height: number | null;
};

export type PublicListing = {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  transaction: "sale" | "rent";
  propertyType: PropertyType;
  price: number;
  currency: string;
  pricePeriod: "month" | null;
  addressLine1: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sizeSqm: number | null;
  lotSqm: number | null;
  yearBuilt: number | null;
  floors: number | null;
  parking: number | null;
  energyClass: EnergyClass | null;
  features: ListingFeatures;
  listedAt: string;
  updatedAt: string;
  photos: PublicListingPhoto[];
};

export type PublicListingsPage = {
  data: PublicListing[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
};

export type PublicListingsOptions = {
  /** Absolute public origin used to build photo URLs. Defaults to `appUrl`. */
  origin?: string;
};

/**
 * Explicit allowlisted projection. Selecting named columns instead of a full
 * listing row keeps seller, agent, commission, and internal state out of the
 * public contract even if the table gains new columns.
 */
const publicListingColumns = {
  id: listings.id,
  reference: listings.reference,
  title: listings.title,
  description: listings.description,
  transaction: listings.transaction,
  propertyType: listings.propertyType,
  price: listings.price,
  currency: listings.currency,
  pricePeriod: listings.pricePeriod,
  addressLine1: listings.addressLine1,
  city: listings.city,
  region: listings.region,
  postalCode: listings.postalCode,
  country: listings.country,
  bedrooms: listings.bedrooms,
  bathrooms: listings.bathrooms,
  sizeSqm: listings.sizeSqm,
  lotSqm: listings.lotSqm,
  yearBuilt: listings.yearBuilt,
  floors: listings.floors,
  parking: listings.parking,
  energyClass: listings.energyClass,
  features: listings.features,
  listedAt: listings.listedAt,
  updatedAt: listings.updatedAt,
} as const;

type PublicListingRow = {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  transaction: "sale" | "rent";
  propertyType: PropertyType;
  price: string;
  currency: string;
  pricePeriod: "month" | null;
  addressLine1: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  bedrooms: number | null;
  bathrooms: string | null;
  sizeSqm: string | null;
  lotSqm: string | null;
  yearBuilt: number | null;
  floors: number | null;
  parking: number | null;
  energyClass: EnergyClass | null;
  features: ListingFeatures;
  listedAt: Date;
  updatedAt: Date;
};

type PublicListingPhotoRow = {
  id: string;
  listingId: string;
  storageKey: string;
  alt: string | null;
  position: number;
  width: number | null;
  height: number | null;
};

function resolveOrigin(origin?: string) {
  return (origin?.trim() || appUrl).replace(/\/+$/, "");
}

/**
 * Photo keys are stored relative to the image storage root, for example
 * `listings/<listingId>/<photoId>.webp`. The public image route serves them
 * below `/images/`, so the public URL is `<origin>/images/<storageKey>`.
 */
export function publicListingPhotoUrl(storageKey: string, origin: string) {
  const base = origin.replace(/\/+$/, "");
  return `${base}${listingPhotoPublicPath(storageKey)}`;
}

function decimalToNumber(value: string | null) {
  return value === null ? null : Number(value);
}

/**
 * Rebuilds the feature object from allowlisted catalog keys only. Unknown or
 * non-true values can never leak through the public projection.
 */
function publicListingFeatures(features: ListingFeatures): ListingFeatures {
  const projected: ListingFeatures = {};
  for (const [group, keys] of Object.entries(features ?? {})) {
    if (typeof keys !== "object" || keys === null) continue;
    const selected: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(keys)) {
      if (value === true && isListingFeatureKey(`${group}.${key}`)) selected[key] = true;
    }
    if (Object.keys(selected).length > 0) projected[group] = selected;
  }
  return projected;
}

function toPublicListing(row: PublicListingRow, photos: PublicListingPhoto[]): PublicListing {
  return {
    id: row.id,
    reference: row.reference,
    title: row.title,
    description: row.description,
    transaction: row.transaction,
    propertyType: row.propertyType,
    price: Number(row.price),
    currency: row.currency,
    pricePeriod: row.pricePeriod,
    addressLine1: row.addressLine1,
    city: row.city,
    region: row.region,
    postalCode: row.postalCode,
    country: row.country,
    bedrooms: row.bedrooms,
    bathrooms: decimalToNumber(row.bathrooms),
    sizeSqm: decimalToNumber(row.sizeSqm),
    lotSqm: decimalToNumber(row.lotSqm),
    yearBuilt: row.yearBuilt,
    floors: row.floors,
    parking: row.parking,
    energyClass: row.energyClass,
    features: publicListingFeatures(row.features),
    listedAt: row.listedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    photos,
  };
}

function photoProjection(row: PublicListingPhotoRow, origin: string): PublicListingPhoto {
  return {
    id: row.id,
    url: publicListingPhotoUrl(row.storageKey, origin),
    alt: row.alt,
    position: row.position,
    width: row.width,
    height: row.height,
  };
}

async function photosForListings(listingIds: string[], origin: string) {
  const photosByListing = new Map<string, PublicListingPhoto[]>();
  if (listingIds.length === 0) return photosByListing;

  const rows = await db
    .select({
      id: listingPhotos.id,
      listingId: listingPhotos.listingId,
      storageKey: listingPhotos.storageKey,
      alt: listingPhotos.alt,
      position: listingPhotos.position,
      width: listingPhotos.width,
      height: listingPhotos.height,
    })
    .from(listingPhotos)
    .where(inArray(listingPhotos.listingId, listingIds))
    .orderBy(asc(listingPhotos.listingId), asc(listingPhotos.position), asc(listingPhotos.id));

  for (const row of rows) {
    const photos = photosByListing.get(row.listingId) ?? [];
    photos.push(photoProjection(row, origin));
    photosByListing.set(row.listingId, photos);
  }

  return photosByListing;
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function assertCurrencyForPrice(params: PublicListingsQuery) {
  const hasPriceRange = params.minPrice !== undefined || params.maxPrice !== undefined;
  const priceSort = params.sort === "price_asc" || params.sort === "price_desc";
  if ((hasPriceRange || priceSort) && !params.currency) {
    throw new Error("A currency is required for public price filters and price sorting");
  }
}

function collectionConditions(params: PublicListingsQuery) {
  assertCurrencyForPrice(params);

  const conditions = [eq(listings.status, "active")];

  if (params.transaction) conditions.push(eq(listings.transaction, params.transaction));
  if (params.propertyType) conditions.push(eq(listings.propertyType, params.propertyType));
  if (params.city) {
    conditions.push(ilike(listings.city, `%${escapeLikePattern(params.city)}%`));
  }
  if (params.bedrooms !== undefined) conditions.push(gte(listings.bedrooms, params.bedrooms));
  if (params.currency) conditions.push(eq(listings.currency, params.currency));
  if (params.minPrice !== undefined) {
    conditions.push(gte(listings.price, params.minPrice.toFixed(2)));
  }
  if (params.maxPrice !== undefined) {
    conditions.push(lte(listings.price, params.maxPrice.toFixed(2)));
  }

  if (params.features.length > 0) {
    const tree: ListingFeatures = {};
    for (const feature of params.features) {
      const [group, key] = feature.split(".");
      tree[group] = { ...tree[group], [key]: true };
    }
    conditions.push(sql`${listings.features} @> ${JSON.stringify(tree)}::jsonb`);
  }

  return and(...conditions);
}

function collectionOrder(params: PublicListingsQuery) {
  if (params.sort === "price_asc") {
    return [asc(listings.price), desc(listings.listedAt), desc(listings.id)];
  }
  if (params.sort === "price_desc") {
    return [desc(listings.price), desc(listings.listedAt), desc(listings.id)];
  }
  return [desc(listings.listedAt), desc(listings.id)];
}

export async function listPublicListings(
  params: PublicListingsQuery,
  options: PublicListingsOptions = {},
): Promise<PublicListingsPage> {
  const origin = resolveOrigin(options.origin);
  const where = collectionConditions(params);

  const [rows, totalRow] = await Promise.all([
    db
      .select(publicListingColumns)
      .from(listings)
      .where(where)
      .orderBy(...collectionOrder(params))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ count: count() }).from(listings).where(where),
  ]);

  const total = Number(totalRow[0]?.count ?? 0);
  const photosByListing = await photosForListings(
    rows.map((row) => row.id),
    origin,
  );

  return {
    data: rows.map((row) => toPublicListing(row, photosByListing.get(row.id) ?? [])),
    meta: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / params.pageSize)),
    },
  };
}

export async function getPublicListing(
  listingId: string,
  options: PublicListingsOptions = {},
): Promise<PublicListing | null> {
  const origin = resolveOrigin(options.origin);

  const [row] = await db
    .select(publicListingColumns)
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.status, "active")))
    .limit(1);

  if (!row) return null;

  const photos = await db
    .select({
      id: listingPhotos.id,
      listingId: listingPhotos.listingId,
      storageKey: listingPhotos.storageKey,
      alt: listingPhotos.alt,
      position: listingPhotos.position,
      width: listingPhotos.width,
      height: listingPhotos.height,
    })
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId))
    .orderBy(asc(listingPhotos.position), asc(listingPhotos.id));

  return toPublicListing(
    row,
    photos.map((photo) => photoProjection(photo, origin)),
  );
}
