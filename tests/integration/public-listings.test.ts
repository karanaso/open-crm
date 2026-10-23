import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  activities,
  contacts,
  listingPhotos,
  listings,
  tasks,
  users,
  type NewListing,
} from "@/db/schema";
import {
  GET as getCollection,
  OPTIONS as collectionOptions,
} from "@/app/api/public/v1/listings/route";
import {
  GET as getDetail,
  OPTIONS as detailOptions,
} from "@/app/api/public/v1/listings/[id]/route";
import {
  createPublicRateLimiter,
  resetPublicRateLimiter,
  setPublicRateLimiter,
} from "@/lib/public-rate-limit";
import { resetDatabase } from "./helpers";

type PublicPhotoJson = {
  id: string;
  url: string;
  alt: string | null;
  position: number;
  width: number | null;
  height: number | null;
};

type PublicListingJson = {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  transaction: string;
  propertyType: string;
  price: number;
  currency: string;
  pricePeriod: string | null;
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
  energyClass: string | null;
  features: Record<string, Record<string, boolean>>;
  listedAt: string;
  updatedAt: string;
  photos: PublicPhotoJson[];
};

type CollectionJson = {
  data: PublicListingJson[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
};

type DetailJson = { data: PublicListingJson };

type ErrorJson = { error: { code: string; message: string } };

const PUBLIC_LISTING_KEYS = [
  "addressLine1",
  "bathrooms",
  "bedrooms",
  "city",
  "country",
  "currency",
  "description",
  "energyClass",
  "features",
  "floors",
  "id",
  "listedAt",
  "lotSqm",
  "parking",
  "photos",
  "postalCode",
  "price",
  "pricePeriod",
  "propertyType",
  "reference",
  "region",
  "sizeSqm",
  "title",
  "transaction",
  "updatedAt",
  "yearBuilt",
].sort();

const PUBLIC_PHOTO_KEYS = ["alt", "height", "id", "position", "url", "width"].sort();

async function responseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function publicRequest(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

async function createUserFixture(name: string) {
  const [user] = await db
    .insert(users)
    .values({
      name,
      email: `agent-${randomUUID()}@example.com`,
      passwordHash: "test-password-hash-not-used-by-public-api",
      role: "admin",
      status: "active",
    })
    .returning();
  return user;
}

async function createSellerFixture(ownerId: string) {
  const [seller] = await db
    .insert(contacts)
    .values({
      firstName: "Eleni",
      lastName: "Seller",
      email: `seller-${randomUUID()}@example.com`,
      phone: "+30 210 1234567",
      ownerId,
    })
    .returning();
  return seller;
}

async function fixture() {
  const owner = await createUserFixture("Internal Agent");
  const seller = await createSellerFixture(owner.id);
  return { owner, seller };
}

async function createPublicListing(
  sellerContactId: string,
  ownerId: string,
  overrides: Partial<NewListing> = {},
) {
  const [listing] = await db
    .insert(listings)
    .values({
      reference: `PUB-${randomUUID().slice(0, 8).toUpperCase()}`,
      title: "Public listing",
      description: null,
      transaction: "sale",
      price: "250000.00",
      commissionAmount: "7500.00",
      currency: "EUR",
      propertyType: "apartment",
      sellerContactId,
      ownerId,
      features: {},
      ...overrides,
    })
    .returning();
  return listing;
}

function collectKeys(value: unknown, keys = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      keys.add(key);
      collectKeys(nested, keys);
    }
  }
  return keys;
}

describe("public listings API", () => {
  beforeEach(async () => {
    resetPublicRateLimiter();
    await resetDatabase();
  });

  afterEach(() => {
    resetPublicRateLimiter();
  });

  it("serves active listings anonymously with the allowlisted projection and ordered photos", async () => {
    const { owner, seller } = await fixture();
    const listing = await createPublicListing(seller.id, owner.id, {
      reference: "PUB-SEASIDE",
      title: "Seaside apartment",
      description: "Two-bedroom apartment near the coast.",
      price: "250000.00",
      currency: "EUR",
      propertyType: "apartment",
      bedrooms: 2,
      bathrooms: "1.5",
      sizeSqm: "95.50",
      lotSqm: "120.00",
      yearBuilt: 2005,
      floors: 3,
      parking: 1,
      energyClass: "a",
      addressLine1: "12 Marina Street",
      city: "Athens",
      region: "Attica",
      postalCode: "10432",
      country: "GR",
      listedAt: new Date("2026-03-01T09:00:00.000Z"),
      features: {
        yard: { swimmingPool: true },
        location: { viewOfCoast: true },
      },
    });

    await db.insert(listingPhotos).values([
      {
        listingId: listing.id,
        storageKey: `listings/${listing.id}/2_second.webp`,
        mimeType: "image/webp",
        position: 1,
        alt: "Second photo",
        width: 800,
        height: 600,
      },
      {
        listingId: listing.id,
        storageKey: `listings/${listing.id}/1_first.webp`,
        mimeType: "image/webp",
        position: 0,
        alt: "First photo",
        width: 1600,
        height: 900,
      },
    ]);

    const response = await getCollection(publicRequest("/api/public/v1/listings"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();

    const body = await responseJson<CollectionJson>(response);
    expect(body.meta).toEqual({ page: 1, pageSize: 20, total: 1, pageCount: 1 });
    expect(body.data).toHaveLength(1);

    const item = body.data[0];
    expect(Object.keys(item).sort()).toEqual(PUBLIC_LISTING_KEYS);
    expect(item).toMatchObject({
      id: listing.id,
      reference: "PUB-SEASIDE",
      title: "Seaside apartment",
      description: "Two-bedroom apartment near the coast.",
      transaction: "sale",
      propertyType: "apartment",
      price: 250000,
      currency: "EUR",
      pricePeriod: null,
      addressLine1: "12 Marina Street",
      city: "Athens",
      region: "Attica",
      postalCode: "10432",
      country: "GR",
      bedrooms: 2,
      bathrooms: 1.5,
      sizeSqm: 95.5,
      lotSqm: 120,
      yearBuilt: 2005,
      floors: 3,
      parking: 1,
      energyClass: "a",
      features: {
        yard: { swimmingPool: true },
        location: { viewOfCoast: true },
      },
      listedAt: "2026-03-01T09:00:00.000Z",
    });
    expect(item.photos.map((photo) => photo.alt)).toEqual(["First photo", "Second photo"]);
    expect(item.photos.map((photo) => photo.position)).toEqual([0, 1]);
    expect(Object.keys(item.photos[0]).sort()).toEqual(PUBLIC_PHOTO_KEYS);
    expect(item.photos[0]).toMatchObject({ width: 1600, height: 900 });
    expect(item.photos[0].url).toBe(
      `http://localhost:3000/images/listings/${listing.id}/1_first.webp`,
    );
    expect(item.photos[1].url).toBe(
      `http://localhost:3000/images/listings/${listing.id}/2_second.webp`,
    );

    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toBe("GET, OPTIONS");
    expect(response.headers.get("access-control-allow-headers")).toBe("Content-Type");
  });

  it("returns one active listing by id and hides inactive and missing listings", async () => {
    const { owner, seller } = await fixture();
    const active = await createPublicListing(seller.id, owner.id, {
      reference: "PUB-ACTIVE",
      title: "Active listing",
    });
    const inactive = await createPublicListing(seller.id, owner.id, {
      reference: "PUB-INACTIVE",
      title: "Inactive listing",
      status: "inactive",
      deactivatedAt: new Date("2026-02-01T00:00:00.000Z"),
    });

    const activeResponse = await getDetail(publicRequest(`/api/public/v1/listings/${active.id}`), {
      params: Promise.resolve({ id: active.id }),
    });
    expect(activeResponse.status).toBe(200);
    const activeBody = await responseJson<DetailJson>(activeResponse);
    expect(activeBody.data.id).toBe(active.id);
    expect(Object.keys(activeBody.data).sort()).toEqual(PUBLIC_LISTING_KEYS);
    expect(activeResponse.headers.get("cache-control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=300",
    );

    const inactiveResponse = await getDetail(
      publicRequest(`/api/public/v1/listings/${inactive.id}`),
      { params: Promise.resolve({ id: inactive.id }) },
    );
    expect(inactiveResponse.status).toBe(404);
    expect(await responseJson<ErrorJson>(inactiveResponse)).toEqual({
      error: { code: "NOT_FOUND", message: "Listing not found." },
    });

    const missingId = randomUUID();
    const missingResponse = await getDetail(publicRequest(`/api/public/v1/listings/${missingId}`), {
      params: Promise.resolve({ id: missingId }),
    });
    expect(missingResponse.status).toBe(404);
    expect((await responseJson<ErrorJson>(missingResponse)).error.code).toBe("NOT_FOUND");

    const invalidResponse = await getDetail(publicRequest("/api/public/v1/listings/not-a-uuid"), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(invalidResponse.status).toBe(400);
    expect((await responseJson<ErrorJson>(invalidResponse)).error.code).toBe("INVALID_PARAMETER");

    const optionsResponse = detailOptions();
    expect(optionsResponse.status).toBe(204);
    expect(optionsResponse.headers.get("access-control-allow-origin")).toBe("*");
    expect(optionsResponse.headers.get("access-control-allow-methods")).toBe("GET, OPTIONS");
    expect(optionsResponse.headers.get("access-control-allow-headers")).toBe("Content-Type");

    const collectionOptionsResponse = collectionOptions();
    expect(collectionOptionsResponse.status).toBe(204);
    expect(collectionOptionsResponse.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("paginates deterministically and validates page bounds", async () => {
    const { owner, seller } = await fixture();
    const newest = await createPublicListing(seller.id, owner.id, {
      reference: "PUB-NEWEST",
      listedAt: new Date("2026-03-03T00:00:00.000Z"),
    });
    const middle = await createPublicListing(seller.id, owner.id, {
      reference: "PUB-MIDDLE",
      listedAt: new Date("2026-03-02T00:00:00.000Z"),
    });
    const oldest = await createPublicListing(seller.id, owner.id, {
      reference: "PUB-OLDEST",
      listedAt: new Date("2026-03-01T00:00:00.000Z"),
    });

    const first = await responseJson<CollectionJson>(
      await getCollection(publicRequest("/api/public/v1/listings?pageSize=2&page=1")),
    );
    expect(first.meta).toEqual({ page: 1, pageSize: 2, total: 3, pageCount: 2 });
    expect(first.data.map((item) => item.id)).toEqual([newest.id, middle.id]);

    const second = await responseJson<CollectionJson>(
      await getCollection(publicRequest("/api/public/v1/listings?pageSize=2&page=2")),
    );
    expect(second.meta).toEqual({ page: 2, pageSize: 2, total: 3, pageCount: 2 });
    expect(second.data.map((item) => item.id)).toEqual([oldest.id]);

    const beyond = await responseJson<CollectionJson>(
      await getCollection(publicRequest("/api/public/v1/listings?pageSize=2&page=3")),
    );
    expect(beyond.data).toEqual([]);
    expect(beyond.meta).toEqual({ page: 3, pageSize: 2, total: 3, pageCount: 2 });

    const maxPageSize = await getCollection(publicRequest("/api/public/v1/listings?pageSize=100"));
    expect(maxPageSize.status).toBe(200);

    for (const query of ["page=0", "page=-1", "page=not-a-number", "pageSize=0", "pageSize=101"]) {
      const response = await getCollection(publicRequest(`/api/public/v1/listings?${query}`));
      expect(response.status, query).toBe(400);
      expect((await responseJson<ErrorJson>(response)).error.code).toBe("INVALID_PARAMETER");
    }
  });

  it("filters active listings by transaction, type, city, bedrooms, features, currency, and price", async () => {
    const { owner, seller } = await fixture();
    const saleApartment = await createPublicListing(seller.id, owner.id, {
      reference: "PUB-EUR-APT",
      title: "Athens apartment",
      transaction: "sale",
      propertyType: "apartment",
      price: "250000.00",
      currency: "EUR",
      city: "Athens",
      bedrooms: 2,
      listedAt: new Date("2026-04-03T00:00:00.000Z"),
      features: {
        yard: { swimmingPool: true },
        location: { viewOfCoast: true },
      },
    });
    const saleHouse = await createPublicListing(seller.id, owner.id, {
      reference: "PUB-EUR-HOUSE",
      title: "Athens house",
      transaction: "sale",
      propertyType: "house",
      price: "100000.00",
      currency: "EUR",
      city: "Athens",
      bedrooms: 3,
      listedAt: new Date("2026-04-02T00:00:00.000Z"),
      features: { yard: { swimmingPool: true } },
    });
    const rentApartment = await createPublicListing(seller.id, owner.id, {
      reference: "PUB-EUR-RENT",
      title: "Thessaloniki studio",
      transaction: "rent",
      pricePeriod: "month",
      propertyType: "apartment",
      price: "1200.00",
      currency: "EUR",
      city: "Thessaloniki",
      bedrooms: 1,
      listedAt: new Date("2026-04-01T00:00:00.000Z"),
      features: { location: { viewOfCoast: true } },
    });
    const usdApartment = await createPublicListing(seller.id, owner.id, {
      reference: "PUB-USD-APT",
      title: "Athens apartment in dollars",
      transaction: "sale",
      propertyType: "apartment",
      price: "250000.00",
      currency: "USD",
      city: "Athens",
      bedrooms: 2,
      listedAt: new Date("2026-04-04T00:00:00.000Z"),
      features: {
        yard: { swimmingPool: true },
        location: { viewOfCoast: true },
      },
    });
    await createPublicListing(seller.id, owner.id, {
      reference: "PUB-EUR-INACTIVE",
      title: "Inactive villa",
      transaction: "sale",
      propertyType: "villa",
      price: "900000.00",
      currency: "EUR",
      city: "Athens",
      bedrooms: 4,
      listedAt: new Date("2026-04-05T00:00:00.000Z"),
      status: "inactive",
      deactivatedAt: new Date("2026-04-06T00:00:00.000Z"),
      features: {
        yard: { swimmingPool: true },
        location: { viewOfCoast: true },
      },
    });

    async function ids(query: string) {
      const response = await getCollection(publicRequest(`/api/public/v1/listings?${query}`));
      expect(response.status, query).toBe(200);
      return (await responseJson<CollectionJson>(response)).data.map((item) => item.id);
    }

    expect(await ids("")).toHaveLength(4);
    expect(await ids("transaction=rent")).toEqual([rentApartment.id]);
    expect(await ids("propertyType=house")).toEqual([saleHouse.id]);
    expect(await ids("city=athens")).toHaveLength(3);
    expect(await ids("city=Athens")).toHaveLength(3);
    expect(await ids("bedrooms=3")).toEqual([saleHouse.id]);
    expect(await ids("features=yard.swimmingPool,location.viewOfCoast")).toEqual(
      expect.arrayContaining([saleApartment.id, usdApartment.id]),
    );
    expect(await ids("features=yard.swimmingPool,location.viewOfCoast")).toHaveLength(2);
    expect(await ids("currency=EUR")).toEqual(
      expect.arrayContaining([saleApartment.id, saleHouse.id, rentApartment.id]),
    );
    expect(await ids("currency=EUR")).toHaveLength(3);
    expect(await ids("currency=EUR&minPrice=150000")).toEqual([saleApartment.id]);
    expect(await ids("currency=USD&maxPrice=250000")).toEqual([usdApartment.id]);
    expect(await ids("currency=EUR&minPrice=1000")).toHaveLength(3);
    expect(await ids("currency=EUR&maxPrice=150000")).toEqual(
      expect.arrayContaining([saleHouse.id, rentApartment.id]),
    );

    expect(await ids("currency=EUR&sort=price_asc")).toEqual([
      rentApartment.id,
      saleHouse.id,
      saleApartment.id,
    ]);
    expect(await ids("currency=EUR&sort=price_desc")).toEqual([
      saleApartment.id,
      saleHouse.id,
      rentApartment.id,
    ]);
    expect(await ids("sort=newest")).toEqual([
      usdApartment.id,
      saleApartment.id,
      saleHouse.id,
      rentApartment.id,
    ]);
  });

  it("rejects invalid filters and price operations without a currency", async () => {
    const { owner, seller } = await fixture();
    const eurListing = await createPublicListing(seller.id, owner.id, {
      reference: "PUB-LOWER-EUR",
      currency: "EUR",
    });
    await createPublicListing(seller.id, owner.id, {
      reference: "PUB-LOWER-USD",
      currency: "USD",
    });

    const cases = [
      "minPrice=100000",
      "maxPrice=100000",
      "sort=price_asc",
      "sort=price_desc",
      "currency=EUR&minPrice=300000&maxPrice=200000",
      "transaction=lease",
      "propertyType=castle",
      "bedrooms=-1",
      "bedrooms=1.5",
      "currency=EURO",
      "features=yard.unknownFeature",
      "sort=expensive",
      "minPrice=not-a-number",
      "page=zero",
      "page=1000001",
      "pageSize=101",
      "bedrooms=1001",
      "currency=EUR&minPrice=1000000000000",
      "currency=EUR&maxPrice=1000000000000",
    ];

    for (const query of cases) {
      const response = await getCollection(publicRequest(`/api/public/v1/listings?${query}`));
      expect(response.status, query).toBe(400);
      const body = await responseJson<ErrorJson>(response);
      expect(body.error.code, query).toBe("INVALID_PARAMETER");
      expect(body.error.message.length, query).toBeGreaterThan(0);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("access-control-allow-origin")).toBe("*");
    }

    const lowerCaseCurrency = await getCollection(
      publicRequest("/api/public/v1/listings?currency=eur"),
    );
    expect(lowerCaseCurrency.status).toBe(200);
    const lowerCaseBody = await responseJson<CollectionJson>(lowerCaseCurrency);
    expect(lowerCaseBody.data.map((item) => item.id)).toEqual([eurListing.id]);
    expect(lowerCaseBody.data[0].currency).toBe("EUR");
  });

  it("does not reveal seller, agent, commission, or internal CRM fields", async () => {
    const owner = await createUserFixture("Secret Agent Person");
    const [seller] = await db
      .insert(contacts)
      .values({
        firstName: "Hidden",
        lastName: "Sellerperson",
        email: `hidden-${randomUUID()}@example.com`,
        phone: "+30 699 111 2222",
        ownerId: owner.id,
      })
      .returning();

    const listing = await createPublicListing(seller.id, owner.id, {
      reference: "PUB-PRIVACY",
      title: "Harbor view home",
      description: "Bright home with a harbor view.",
      price: "250000.00",
      commissionAmount: "9876.54",
      currency: "EUR",
      propertyType: "house",
      addressLine1: "4 Harbor Road",
      city: "Athens",
      features: {
        yard: { swimmingPool: true, internalSecret: true },
      },
    });

    await db.insert(activities).values({
      type: "note",
      subject: "Private seller call",
      body: "Internal seller follow-up",
      authorId: owner.id,
      listingId: listing.id,
    });
    await db.insert(tasks).values({
      title: "Prepare private contract",
      dueDate: "2026-12-31",
      createdById: owner.id,
      listingId: listing.id,
    });
    await db.insert(listingPhotos).values({
      listingId: listing.id,
      storageKey: `listings/${listing.id}/1_privacy.webp`,
      mimeType: "image/webp",
      position: 0,
      alt: "Harbor view",
    });

    const collectionBody = await responseJson<CollectionJson>(
      await getCollection(publicRequest("/api/public/v1/listings")),
    );
    const detailBody = await responseJson<DetailJson>(
      await getDetail(publicRequest(`/api/public/v1/listings/${listing.id}`), {
        params: Promise.resolve({ id: listing.id }),
      }),
    );

    expect(collectionBody.data).toHaveLength(1);
    expect(detailBody.data.id).toBe(listing.id);

    const forbiddenValues = [
      seller.id,
      seller.firstName,
      seller.lastName,
      `${seller.firstName} ${seller.lastName}`,
      seller.email,
      seller.phone ?? "",
      owner.id,
      owner.email,
      owner.name,
      "9876.54",
      "commission",
      "Private seller call",
      "Internal seller follow-up",
      "Prepare private contract",
    ].filter(Boolean);

    for (const payload of [collectionBody.data[0], detailBody.data]) {
      const serialized = JSON.stringify(payload).toLowerCase();
      for (const value of forbiddenValues) {
        expect(serialized, `leaked ${value}`).not.toContain(value.toLowerCase());
      }

      const keys = Array.from(collectKeys(payload));
      for (const key of keys) {
        expect(key).not.toMatch(
          /seller|owner|agent|commission|contact|deactivat|activit|task|note|ticket|campaign|segment|viewing|deal/i,
        );
      }

      expect(Object.keys(payload).sort()).toEqual(PUBLIC_LISTING_KEYS);
      expect(payload.features).toEqual({ yard: { swimmingPool: true } });
      expect(payload.photos[0]).not.toHaveProperty("storageKey");
      expect(Object.keys(payload.photos[0]).sort()).toEqual(PUBLIC_PHOTO_KEYS);
    }
  });

  it("rate limits each client and returns a retry hint", async () => {
    const { owner, seller } = await fixture();
    const listing = await createPublicListing(seller.id, owner.id);
    setPublicRateLimiter(createPublicRateLimiter({ limit: 2, windowMs: 60_000 }));

    const headers = { "x-forwarded-for": "198.51.100.10" };
    expect((await getCollection(publicRequest("/api/public/v1/listings", headers))).status).toBe(
      200,
    );
    expect((await getCollection(publicRequest("/api/public/v1/listings", headers))).status).toBe(
      200,
    );

    const limited = await getCollection(publicRequest("/api/public/v1/listings", headers));
    expect(limited.status).toBe(429);
    const retryAfter = Number(limited.headers.get("retry-after"));
    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);
    expect(limited.headers.get("access-control-allow-origin")).toBe("*");
    expect((await responseJson<ErrorJson>(limited)).error.code).toBe("RATE_LIMITED");

    const limitedDetail = await getDetail(
      publicRequest(`/api/public/v1/listings/${listing.id}`, headers),
      { params: Promise.resolve({ id: listing.id }) },
    );
    expect(limitedDetail.status).toBe(429);

    const otherClient = await getCollection(
      publicRequest("/api/public/v1/listings", {
        "x-forwarded-for": "198.51.100.11",
      }),
    );
    expect(otherClient.status).toBe(200);
  });

  it("returns a generic 500 without database details when the query fails", async () => {
    const { owner, seller } = await fixture();
    await createPublicListing(seller.id, owner.id);

    await db.execute(sql`alter table listings rename to listings_public_api_error_probe`);
    try {
      const response = await getCollection(publicRequest("/api/public/v1/listings"));
      expect(response.status).toBe(500);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("access-control-allow-origin")).toBe("*");

      const text = await response.text();
      const body = JSON.parse(text) as ErrorJson;
      expect(body).toEqual({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred.",
        },
      });
      expect(text).not.toContain("listings_public_api_error_probe");
      expect(text.toLowerCase()).not.toContain("postgres");
      expect(text.toLowerCase()).not.toContain("relation");
      expect(text.toLowerCase()).not.toContain("sql");
    } finally {
      await db.execute(sql`alter table listings_public_api_error_probe rename to listings`);
    }
  });
});
