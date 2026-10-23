import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { db } from "@/db";
import { contacts, deals, listingPhotos, listings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resetDatabase } from "./helpers";
import {
  createContact,
  createTestPipeline,
  createUser,
  createViewing,
} from "./factories";
import {
  createListing,
  getListing,
  getListingOptions,
  listListings,
  setListingStatus,
  updateListing,
} from "@/lib/services/listings";
import { getListingsDashboard } from "@/lib/services/listings-dashboard";
import { listingInputSchema, listingListParamsSchema } from "@/lib/validation/listing";

type ListingOverrides = Record<string, unknown>;

async function fixture() {
  const admin = await createUser({ role: "admin", name: "Admin Agent" });
  const member = await createUser({ name: "Member Agent" });
  const seller = await createContact(admin.id, null, {
    firstName: "Elena",
    lastName: "Seller",
    email: "elena.seller@example.com",
  });
  return { admin, member, seller };
}

function listingInput(sellerContactId: string, overrides: ListingOverrides = {}) {
  return listingInputSchema.parse({
    reference: `RE-${randomUUID().slice(0, 8).toUpperCase()}`,
    title: "Test property",
    transaction: "sale",
    pricePeriod: null,
    price: "100000",
    commissionAmount: "2500",
    currency: "EUR",
    propertyType: "apartment",
    sellerContactId,
    features: {},
    ...overrides,
  });
}

function listParams(overrides: Record<string, unknown> = {}) {
  return listingListParamsSchema.parse(overrides);
}

describe("listing services", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates an active sale listing owned by the actor", async () => {
    const { admin, seller } = await fixture();
    const listing = await createListing(
      listingInput(seller.id, {
        price: "250000",
        commissionAmount: "7500",
        bedrooms: "2",
        bathrooms: "1.5",
        sizeSqm: "95.5",
        energyClass: "a",
        features: {
          yard: { swimmingPool: true },
          location: { viewOfCoast: true },
        },
      }),
      admin.id,
    );

    expect(listing).toMatchObject({
      status: "active",
      transaction: "sale",
      price: "250000.00",
      commissionAmount: "7500.00",
      currency: "EUR",
      bedrooms: 2,
      bathrooms: "1.5",
      sizeSqm: "95.50",
      energyClass: "a",
      ownerId: admin.id,
      sellerContactId: seller.id,
      deactivatedAt: null,
    });
    expect(listing.listedAt).toBeInstanceOf(Date);
    expect(listing.features).toEqual({
      yard: { swimmingPool: true },
      location: { viewOfCoast: true },
    });
  });

  it("creates rent listings with a monthly period", async () => {
    const { admin, seller } = await fixture();
    const listing = await createListing(
      listingInput(seller.id, {
        transaction: "rent",
        pricePeriod: "month",
        price: "1200",
      }),
      admin.id,
    );
    expect(listing.transaction).toBe("rent");
    expect(listing.pricePeriod).toBe("month");
  });

  it("rejects a duplicate reference", async () => {
    const { admin, seller } = await fixture();
    const input = listingInput(seller.id, { reference: "RE-DUPLICATE" });
    const listing = await createListing(input, admin.id);
    const other = await createListing(listingInput(seller.id), admin.id);

    await expect(createListing(input, admin.id)).rejects.toThrow("already exists");
    await expect(
      updateListing(other.id, listingInput(seller.id, { reference: "RE-DUPLICATE" })),
    ).rejects.toThrow("already exists");
    await expect(updateListing(randomUUID(), input)).rejects.toThrow("not found");
    expect(listing.reference).toBe("RE-DUPLICATE");
  });

  it("rejects an archived seller on create but keeps an archived seller on update", async () => {
    const { admin, seller } = await fixture();
    const otherSeller = await createContact(admin.id, null, {
      firstName: "Other",
      lastName: "Seller",
    });
    const listing = await createListing(listingInput(seller.id), admin.id);

    await db.update(contacts).set({ archivedAt: new Date() }).where(eq(contacts.id, seller.id));

    await expect(createListing(listingInput(seller.id), admin.id)).rejects.toThrow(
      "active seller",
    );

    const updated = await updateListing(
      listing.id,
      listingInput(seller.id, { title: "Renovated apartment" }),
    );
    expect(updated.title).toBe("Renovated apartment");
    expect(updated.sellerContactId).toBe(seller.id);

    await db
      .update(contacts)
      .set({ archivedAt: new Date() })
      .where(eq(contacts.id, otherSeller.id));
    await expect(
      updateListing(listing.id, listingInput(otherSeller.id)),
    ).rejects.toThrow("active seller");

    const detail = await getListing(listing.id);
    expect(detail?.sellerName).toBe("Elena Seller");
    expect(detail?.sellerArchivedAt).not.toBeNull();
  });

  it("rejects an inactive agent", async () => {
    const { admin, seller } = await fixture();
    const inactive = await createUser({ status: "inactive", name: "Gone Agent" });

    await expect(
      createListing(listingInput(seller.id, { ownerId: inactive.id }), admin.id),
    ).rejects.toThrow("active team member");

    const listing = await createListing(listingInput(seller.id), admin.id);
    await expect(
      updateListing(listing.id, listingInput(seller.id, { ownerId: inactive.id })),
    ).rejects.toThrow("active team member");
  });

  it("updates fields without touching status or listedAt", async () => {
    const { admin, member, seller } = await fixture();
    const listing = await createListing(listingInput(seller.id), admin.id);
    const deactivated = await setListingStatus(listing.id, "inactive");

    const updated = await updateListing(
      listing.id,
      listingInput(seller.id, {
        title: "Updated title",
        price: "180000",
        ownerId: member.id,
        bedrooms: "3",
      }),
    );

    expect(updated).toMatchObject({
      title: "Updated title",
      price: "180000.00",
      ownerId: member.id,
      bedrooms: 3,
      status: "inactive",
      listedAt: listing.listedAt,
      deactivatedAt: deactivated.deactivatedAt,
    });
  });

  it("returns seller, owner, ordered photos, and linked deals", async () => {
    const { admin, seller } = await fixture();
    const buyer = await createContact(admin.id, null, {
      firstName: "Nikos",
      lastName: "Buyer",
    });
    const listing = await createListing(listingInput(seller.id), admin.id);
    const { pipeline, openStage } = await createTestPipeline();

    await db.insert(listingPhotos).values([
      {
        listingId: listing.id,
        storageKey: `listings/${listing.id}/2.webp`,
        mimeType: "image/webp",
        position: 1,
        alt: "Second",
      },
      {
        listingId: listing.id,
        storageKey: `listings/${listing.id}/1.webp`,
        mimeType: "image/webp",
        position: 0,
        alt: "First",
      },
    ]);
    await db.insert(deals).values({
      name: "Offer for listing",
      contactId: buyer.id,
      listingId: listing.id,
      pipelineId: pipeline.id,
      stageId: openStage.id,
      ownerId: admin.id,
      propertyPrice: "100000.00",
      amount: "2500.00",
      currency: "EUR",
    });

    const detail = await getListing(listing.id);
    expect(detail).not.toBeNull();
    expect(detail?.sellerName).toBe("Elena Seller");
    expect(detail?.sellerEmail).toBe("elena.seller@example.com");
    expect(detail?.ownerName).toBe("Admin Agent");
    expect(detail?.ownerStatus).toBe("active");
    expect(detail?.photos.map((photo) => photo.alt)).toEqual(["First", "Second"]);
    expect(detail?.deals).toHaveLength(1);
    expect(detail?.deals[0]).toMatchObject({
      name: "Offer for listing",
      status: "open",
      amount: "2500.00",
      propertyPrice: "100000.00",
      currency: "EUR",
      contactName: "Nikos Buyer",
    });

    const otherListing = await createListing(
      listingInput(seller.id, { reference: "RE-ISOLATED" }),
      admin.id,
    );
    expect((await getListing(otherListing.id))?.deals).toEqual([]);
    expect(await getListing(randomUUID())).toBeNull();
  });

  it("filters, searches, sorts, and paginates listings", async () => {
    const { admin, seller } = await fixture();
    const landlord = await createContact(admin.id, null, {
      firstName: "Petros",
      lastName: "Landlord",
    });

    const seaside = await createListing(
      listingInput(seller.id, {
        reference: "RE-ALPHA",
        title: "Seaside apartment",
        transaction: "sale",
        price: "250000",
        currency: "EUR",
        propertyType: "apartment",
        addressLine1: "12 Marina Street",
        city: "Athens",
        bedrooms: "2",
        features: {
          yard: { swimmingPool: true },
          location: { viewOfCoast: true },
        },
      }),
      admin.id,
    );
    const townhouse = await createListing(
      listingInput(seller.id, {
        reference: "RE-BETA",
        title: "Townhouse",
        transaction: "sale",
        price: "100000",
        currency: "EUR",
        propertyType: "house",
        city: "Athens",
        bedrooms: "3",
        features: { yard: { swimmingPool: true } },
      }),
      admin.id,
    );
    const studio = await createListing(
      listingInput(landlord.id, {
        reference: "RE-GAMMA",
        title: "City studio",
        transaction: "rent",
        pricePeriod: "month",
        price: "1200",
        currency: "EUR",
        propertyType: "apartment",
        city: "Thessaloniki",
        bedrooms: "1",
        features: { location: { viewOfCoast: true } },
      }),
      admin.id,
    );
    const villa = await createListing(
      listingInput(seller.id, {
        reference: "RE-DELTA",
        title: "Inactive villa",
        price: "400000",
        currency: "USD",
        propertyType: "villa",
        city: "Athens",
        bedrooms: "4",
        features: {
          yard: { swimmingPool: true },
          location: { viewOfCoast: true },
        },
      }),
      admin.id,
    );
    await setListingStatus(villa.id, "inactive");

    const active = await listListings(listParams());
    expect(active.total).toBe(3);
    expect(active.items.map((item) => item.id)).not.toContain(villa.id);
    expect(active.items[0].sellerName).toBeDefined();
    expect(active.items[0].ownerName).toBe("Admin Agent");

    expect((await listListings(listParams({ status: "all" }))).total).toBe(4);
    expect((await listListings(listParams({ status: "inactive" }))).items.map((item) => item.id)).toEqual([
      villa.id,
    ]);

    expect((await listListings(listParams({ q: "RE-ALPHA" }))).items.map((item) => item.id)).toEqual([
      seaside.id,
    ]);
    expect((await listListings(listParams({ q: "Townhouse" }))).items.map((item) => item.id)).toEqual([
      townhouse.id,
    ]);
    expect((await listListings(listParams({ q: "Thessaloniki" }))).items.map((item) => item.id)).toEqual([
      studio.id,
    ]);
    expect((await listListings(listParams({ q: "Marina" }))).items.map((item) => item.id)).toEqual([
      seaside.id,
    ]);
    expect((await listListings(listParams({ q: "Petros Landlord" }))).items.map((item) => item.id)).toEqual([
      studio.id,
    ]);

    expect((await listListings(listParams({ transaction: "rent" }))).items.map((item) => item.id)).toEqual([
      studio.id,
    ]);
    expect((await listListings(listParams({ propertyType: "house" }))).items.map((item) => item.id)).toEqual([
      townhouse.id,
    ]);
    const athens = await listListings(listParams({ city: "Athens" }));
    expect(athens.total).toBe(2);
    expect(athens.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([seaside.id, townhouse.id]),
    );
    expect((await listListings(listParams({ bedrooms: "3" }))).items.map((item) => item.id)).toEqual([
      townhouse.id,
    ]);

    expect((await listListings(listParams({ currency: "EUR" }))).total).toBe(3);

    const usdActive = await createListing(
      listingInput(seller.id, {
        reference: "RE-USD",
        price: "250000",
        currency: "USD",
      }),
      admin.id,
    );
    expect(
      (await listListings(listParams({ currency: "EUR", minPrice: "150000" }))).items.map(
        (item) => item.id,
      ),
    ).toEqual([seaside.id]);
    await setListingStatus(usdActive.id, "inactive");
    const affordable = await listListings(
      listParams({ currency: "EUR", maxPrice: "120000" }),
    );
    expect(affordable.total).toBe(2);
    expect(affordable.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([townhouse.id, studio.id]),
    );

    expect(
      (await listListings(listParams({ features: "yard.swimmingPool,location.viewOfCoast" }))).items.map(
        (item) => item.id,
      ),
    ).toEqual([seaside.id]);
    const pools = await listListings(listParams({ features: "yard.swimmingPool" }));
    expect(pools.total).toBe(2);
    expect(pools.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([seaside.id, townhouse.id]),
    );
    const seaViews = await listListings(listParams({ features: ["location.viewOfCoast"] }));
    expect(seaViews.total).toBe(2);
    expect(seaViews.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([seaside.id, studio.id]),
    );

    expect(
      (await listListings(listParams({ currency: "EUR", sort: "price_asc" }))).items.map(
        (item) => item.id,
      ),
    ).toEqual([studio.id, townhouse.id, seaside.id]);
    expect(
      (await listListings(listParams({ currency: "EUR", sort: "price_desc" }))).items.map(
        (item) => item.id,
      ),
    ).toEqual([seaside.id, townhouse.id, studio.id]);

    await db
      .update(listings)
      .set({ listedAt: new Date("2020-01-01T00:00:00.000Z") })
      .where(eq(listings.id, studio.id));
    const byListed = await listListings(listParams({ sort: "listed_at" }));
    expect(byListed.items.at(-1)?.id).toBe(studio.id);

    const firstPage = await listListings(listParams({ pageSize: "2" }));
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.pageCount).toBe(2);
    expect(firstPage.total).toBe(3);
    const secondPage = await listListings(listParams({ pageSize: "2", page: "2" }));
    expect(secondPage.items).toHaveLength(1);

    await expect(
      listListings({ ...listParams(), minPrice: 1000, currency: undefined }),
    ).rejects.toThrow("currency");
    await expect(
      listListings({ ...listParams(), sort: "price_asc", currency: undefined }),
    ).rejects.toThrow("currency");
  });

  it("deactivates and restores listings without deleting them", async () => {
    const { admin, seller } = await fixture();
    const listing = await createListing(listingInput(seller.id), admin.id);

    const inactive = await setListingStatus(listing.id, "inactive");
    expect(inactive.status).toBe("inactive");
    expect(inactive.deactivatedAt).toBeInstanceOf(Date);
    expect((await listListings(listParams())).total).toBe(0);
    expect((await getListing(listing.id))?.status).toBe("inactive");

    const active = await setListingStatus(listing.id, "active");
    expect(active.status).toBe("active");
    expect(active.deactivatedAt).toBeNull();
    expect((await listListings(listParams())).total).toBe(1);

    await expect(setListingStatus(randomUUID(), "inactive")).rejects.toThrow("not found");
  });

  it("lists only active listings as deal picker options", async () => {
    const { admin, seller } = await fixture();
    const active = await createListing(listingInput(seller.id, { reference: "RE-ACTIVE" }), admin.id);
    const inactive = await createListing(
      listingInput(seller.id, { reference: "RE-INACTIVE" }),
      admin.id,
    );
    await setListingStatus(inactive.id, "inactive");

    const options = await getListingOptions();
    expect(options.map((option) => option.id)).toEqual([active.id]);
  });
});

describe("listings dashboard", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns zeroed aggregates when there is no inventory", async () => {
    const dashboard = await getListingsDashboard(new Date());
    expect(dashboard).toEqual({
      activeByTransaction: [
        { transaction: "sale", count: 0 },
        { transaction: "rent", count: 0 },
      ],
      activeTotal: 0,
      newThisMonth: 0,
      upcomingViewings: 0,
      agingCount: 0,
      agingThresholdDays: 90,
      askingSaleValue: [],
      monthlyRentRoll: [],
    });
  });

  it("groups inventory and money by transaction and currency", async () => {
    const { admin, seller } = await fixture();
    const now = new Date();

    const agedSale = await createListing(
      listingInput(seller.id, {
        reference: "RE-DASH-1",
        price: "250000",
        currency: "EUR",
      }),
      admin.id,
    );
    const usdSale = await createListing(
      listingInput(seller.id, {
        reference: "RE-DASH-2",
        price: "400000",
        currency: "USD",
      }),
      admin.id,
    );
    const eurRent = await createListing(
      listingInput(seller.id, {
        reference: "RE-DASH-3",
        transaction: "rent",
        pricePeriod: "month",
        price: "1200",
        currency: "EUR",
      }),
      admin.id,
    );
    await createListing(
      listingInput(seller.id, {
        reference: "RE-DASH-4",
        transaction: "rent",
        pricePeriod: "month",
        price: "2000",
        currency: "USD",
      }),
      admin.id,
    );
    const inactive = await createListing(
      listingInput(seller.id, {
        reference: "RE-DASH-5",
        price: "999000",
        currency: "EUR",
      }),
      admin.id,
    );
    await setListingStatus(inactive.id, "inactive");
    await db
      .update(listings)
      .set({ listedAt: addDays(now, -120) })
      .where(eq(listings.id, agedSale.id));

    const viewingContact = await createContact(admin.id, null);
    await createViewing(agedSale.id, viewingContact.id, admin.id, {
      scheduledAt: addDays(now, 30),
    });
    await createViewing(usdSale.id, viewingContact.id, admin.id, {
      scheduledAt: addDays(now, 60),
    });
    await createViewing(eurRent.id, viewingContact.id, admin.id, {
      scheduledAt: addDays(now, -30),
    });
    await createViewing(eurRent.id, viewingContact.id, admin.id, {
      scheduledAt: addDays(now, 90),
      status: "completed",
    });

    const dashboard = await getListingsDashboard(now);

    expect(dashboard.activeByTransaction).toEqual([
      { transaction: "sale", count: 2 },
      { transaction: "rent", count: 2 },
    ]);
    expect(dashboard.activeTotal).toBe(4);
    expect(dashboard.newThisMonth).toBe(3);
    expect(dashboard.upcomingViewings).toBe(2);
    expect(dashboard.agingCount).toBe(1);
    expect(dashboard.agingThresholdDays).toBe(90);
    expect(dashboard.askingSaleValue).toEqual([
      { currency: "EUR", total: 250000 },
      { currency: "USD", total: 400000 },
    ]);
    expect(dashboard.monthlyRentRoll).toEqual([
      { currency: "EUR", total: 1200 },
      { currency: "USD", total: 2000 },
    ]);
    expect(dashboard).not.toHaveProperty("askingSaleTotal");
    expect(dashboard).not.toHaveProperty("totalValue");
  });
});
