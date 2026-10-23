import { describe, expect, it } from "vitest";
import {
  listingInputSchema,
  listingListParamsSchema,
  listingStatusSchema,
} from "@/lib/validation/listing";
import {
  viewingInputSchema,
  viewingStatusSchema,
} from "@/lib/validation/listing-viewing";
import { workspaceSettingsSchema } from "@/lib/validation/workspace-settings";

const SELLER_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "22222222-2222-4222-8222-222222222222";
const LISTING_ID = "33333333-3333-4333-8333-333333333333";
const CONTACT_ID = "44444444-4444-4444-8444-444444444444";
const VIEWING_ID = "55555555-5555-4555-8555-555555555555";

function saleListing(overrides: Record<string, unknown> = {}) {
  return {
    reference: "RE-1001",
    title: "Seaside apartment",
    description: "Two bedroom apartment",
    transaction: "sale",
    pricePeriod: null,
    price: "250000",
    commissionAmount: "5000",
    currency: "EUR",
    addressLine1: "12 Marina Street",
    city: "Athens",
    region: "Attica",
    postalCode: "10558",
    country: "Greece",
    propertyType: "apartment",
    bedrooms: "2",
    bathrooms: "1.5",
    sizeSqm: "95.5",
    lotSqm: "",
    yearBuilt: "2010",
    floors: "3",
    parking: "1",
    energyClass: "a",
    sellerContactId: SELLER_ID,
    ownerId: OWNER_ID,
    features: {
      yard: { swimmingPool: true, spa: false },
      location: { viewOfCoast: true },
      kitchenFeatures: { islands: false },
    },
    ...overrides,
  };
}

describe("listing input validation", () => {
  it("accepts a complete sale listing and normalizes money, currency, and features", () => {
    const parsed = listingInputSchema.parse(
      saleListing({ currency: "eur", price: "250000.5", commissionAmount: "" }),
    );

    expect(parsed).toMatchObject({
      reference: "RE-1001",
      transaction: "sale",
      pricePeriod: null,
      price: 250000.5,
      commissionAmount: 0,
      currency: "EUR",
      bedrooms: 2,
      bathrooms: 1.5,
      sizeSqm: 95.5,
      lotSqm: null,
      yearBuilt: 2010,
      floors: 3,
      parking: 1,
      energyClass: "a",
      ownerId: OWNER_ID,
    });
    expect(parsed.features).toEqual({
      yard: { swimmingPool: true },
      location: { viewOfCoast: true },
    });
  });

  it("defaults commission and features", () => {
    const parsed = listingInputSchema.parse(
      saleListing({ commissionAmount: undefined, features: undefined }),
    );
    expect(parsed.commissionAmount).toBe(0);
    expect(parsed.features).toEqual({});
  });

  it("requires a monthly period for rent and rejects one for sale", () => {
    const rent = listingInputSchema.safeParse(
      saleListing({ transaction: "rent", pricePeriod: "month", price: "1200" }),
    );
    expect(rent.success).toBe(true);

    const missingPeriod = listingInputSchema.safeParse(
      saleListing({ transaction: "rent", pricePeriod: null, price: "1200" }),
    );
    expect(missingPeriod.success).toBe(false);
    if (!missingPeriod.success) {
      expect(missingPeriod.error.issues[0].path).toEqual(["pricePeriod"]);
    }

    const saleWithPeriod = listingInputSchema.safeParse(
      saleListing({ pricePeriod: "month" }),
    );
    expect(saleWithPeriod.success).toBe(false);
    if (!saleWithPeriod.success) {
      expect(saleWithPeriod.error.issues[0].path).toEqual(["pricePeriod"]);
    }
  });

  it("rejects negative, too large, and over-precise money", () => {
    expect(listingInputSchema.safeParse(saleListing({ price: "-1" })).success).toBe(false);
    expect(listingInputSchema.safeParse(saleListing({ price: "10.123" })).success).toBe(false);
    expect(listingInputSchema.safeParse(saleListing({ price: "1000000000000" })).success).toBe(
      false,
    );
    expect(
      listingInputSchema.safeParse(saleListing({ commissionAmount: "-0.01" })).success,
    ).toBe(false);
    expect(
      listingInputSchema.safeParse(saleListing({ commissionAmount: "1.234" })).success,
    ).toBe(false);
    expect(listingInputSchema.safeParse(saleListing({ price: "" })).success).toBe(false);
  });

  it("validates the currency code", () => {
    expect(listingInputSchema.safeParse(saleListing({ currency: "EU" })).success).toBe(false);
    expect(listingInputSchema.safeParse(saleListing({ currency: "12A" })).success).toBe(false);
    expect(listingInputSchema.safeParse(saleListing({ currency: "" })).success).toBe(false);
    const lower = listingInputSchema.parse(saleListing({ currency: " usd " }));
    expect(lower.currency).toBe("USD");
  });

  it("validates optional numeric facts and the current-year bound", () => {
    const currentYear = new Date().getUTCFullYear();
    expect(listingInputSchema.safeParse(saleListing({ yearBuilt: "999" })).success).toBe(false);
    expect(
      listingInputSchema.safeParse(saleListing({ yearBuilt: String(currentYear + 1) })).success,
    ).toBe(false);
    expect(
      listingInputSchema.parse(saleListing({ yearBuilt: String(currentYear) })).yearBuilt,
    ).toBe(currentYear);

    expect(listingInputSchema.safeParse(saleListing({ bedrooms: "-1" })).success).toBe(false);
    expect(listingInputSchema.safeParse(saleListing({ bedrooms: "2.5" })).success).toBe(false);
    expect(listingInputSchema.safeParse(saleListing({ bathrooms: "1.25" })).success).toBe(false);
    expect(listingInputSchema.safeParse(saleListing({ sizeSqm: "12.345" })).success).toBe(false);
    expect(listingInputSchema.safeParse(saleListing({ floors: "-1" })).success).toBe(false);

    const blank = listingInputSchema.parse(
      saleListing({
        bedrooms: "",
        bathrooms: "",
        sizeSqm: "",
        lotSqm: "",
        yearBuilt: "",
        floors: "",
        parking: "",
        energyClass: "",
      }),
    );
    expect(blank).toMatchObject({
      bedrooms: null,
      bathrooms: null,
      sizeSqm: null,
      lotSqm: null,
      yearBuilt: null,
      floors: null,
      parking: null,
      energyClass: null,
    });
  });

  it("rejects unknown feature groups and keys", () => {
    const unknownGroup = listingInputSchema.safeParse(
      saleListing({ features: { basement: { wineCellar: true } } }),
    );
    expect(unknownGroup.success).toBe(false);
    if (!unknownGroup.success) {
      expect(unknownGroup.error.issues[0].path).toEqual(["features", "basement", "wineCellar"]);
    }

    const unknownKey = listingInputSchema.safeParse(
      saleListing({ features: { yard: { helipad: true } } }),
    );
    expect(unknownKey.success).toBe(false);
  });

  it("rejects non-boolean feature values and unknown property types", () => {
    expect(
      listingInputSchema.safeParse(saleListing({ features: { yard: { spa: "yes" } } })).success,
    ).toBe(false);
    expect(listingInputSchema.safeParse(saleListing({ propertyType: "castle" })).success).toBe(
      false,
    );
    expect(listingInputSchema.safeParse(saleListing({ transaction: "lease" })).success).toBe(false);
  });

  it("requires a valid seller and validates the optional owner", () => {
    expect(
      listingInputSchema.safeParse(saleListing({ sellerContactId: "not-a-uuid" })).success,
    ).toBe(false);
    expect(listingInputSchema.safeParse(saleListing({ sellerContactId: "" })).success).toBe(false);
    expect(listingInputSchema.parse(saleListing({ ownerId: "" })).ownerId).toBeNull();
  });
});

describe("listing list parameters", () => {
  it("applies defaults", () => {
    const parsed = listingListParamsSchema.parse({});
    expect(parsed).toMatchObject({
      q: "",
      status: "active",
      sort: "updated",
      page: 1,
      pageSize: 20,
      features: [],
    });
  });

  it("treats blank URL values as unset", () => {
    const parsed = listingListParamsSchema.parse({
      q: "",
      status: "",
      transaction: "",
      propertyType: "",
      city: "",
      bedrooms: "",
      minPrice: "",
      maxPrice: "",
      currency: "",
      features: "",
      sort: "",
    });
    expect(parsed.status).toBe("active");
    expect(parsed.sort).toBe("updated");
    expect(parsed.transaction).toBeUndefined();
    expect(parsed.minPrice).toBeUndefined();
    expect(parsed.currency).toBeUndefined();
    expect(parsed.features).toEqual([]);
  });

  it("requires a currency for price filters and price sorting", () => {
    expect(listingListParamsSchema.safeParse({ minPrice: "1000" }).success).toBe(false);
    expect(listingListParamsSchema.safeParse({ maxPrice: "1000" }).success).toBe(false);
    expect(listingListParamsSchema.safeParse({ sort: "price_asc" }).success).toBe(false);
    expect(listingListParamsSchema.safeParse({ sort: "price_desc" }).success).toBe(false);
    expect(
      listingListParamsSchema.safeParse({ minPrice: "1000", currency: "eur" }).success,
    ).toBe(true);
    expect(
      listingListParamsSchema.safeParse({ sort: "price_asc", currency: "USD" }).success,
    ).toBe(true);
  });

  it("rejects an inverted price range", () => {
    const parsed = listingListParamsSchema.safeParse({
      minPrice: "5000",
      maxPrice: "1000",
      currency: "EUR",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toEqual(["maxPrice"]);
    }
  });

  it("parses comma-separated feature filters and rejects unknown keys", () => {
    const parsed = listingListParamsSchema.parse({
      features: "yard.swimmingPool, location.viewOfCoast",
    });
    expect(parsed.features).toEqual(["yard.swimmingPool", "location.viewOfCoast"]);

    const arrayParsed = listingListParamsSchema.parse({
      features: ["yard.swimmingPool"],
    });
    expect(arrayParsed.features).toEqual(["yard.swimmingPool"]);

    const unknown = listingListParamsSchema.safeParse({ features: "yard.helipad" });
    expect(unknown.success).toBe(false);
    if (!unknown.success) {
      expect(unknown.error.issues[0].path).toEqual(["features"]);
    }
  });

  it("bounds pagination and validates enums", () => {
    expect(listingListParamsSchema.safeParse({ page: 0 }).success).toBe(false);
    expect(listingListParamsSchema.safeParse({ pageSize: 101 }).success).toBe(false);
    expect(listingListParamsSchema.safeParse({ status: "deleted" }).success).toBe(false);
    expect(listingListParamsSchema.safeParse({ transaction: "lease" }).success).toBe(false);
    expect(listingListParamsSchema.safeParse({ currency: "EU" }).success).toBe(false);
  });
});

describe("listing status validation", () => {
  it("accepts active and inactive with a listing id", () => {
    expect(listingStatusSchema.parse({ listingId: LISTING_ID, status: "active" }).status).toBe(
      "active",
    );
    expect(listingStatusSchema.parse({ listingId: LISTING_ID, status: "inactive" }).status).toBe(
      "inactive",
    );
  });

  it("rejects unknown statuses and invalid ids", () => {
    expect(listingStatusSchema.safeParse({ listingId: LISTING_ID, status: "sold" }).success).toBe(
      false,
    );
    expect(listingStatusSchema.safeParse({ listingId: "nope", status: "active" }).success).toBe(
      false,
    );
  });
});

describe("viewing input validation", () => {
  function viewing(overrides: Record<string, unknown> = {}) {
    return {
      listingId: LISTING_ID,
      contactId: CONTACT_ID,
      agentId: OWNER_ID,
      scheduledAt: "2030-01-10T10:00:00.000Z",
      durationMinutes: "45",
      status: "scheduled",
      notes: "Meet at the lobby",
      ...overrides,
    };
  }

  it("accepts a scheduled viewing and applies defaults", () => {
    const parsed = viewingInputSchema.parse(viewing());
    expect(parsed).toMatchObject({
      listingId: LISTING_ID,
      contactId: CONTACT_ID,
      agentId: OWNER_ID,
      durationMinutes: 45,
      status: "scheduled",
    });

    const defaults = viewingInputSchema.parse(
      viewing({ agentId: "", durationMinutes: "", status: "", notes: "" }),
    );
    expect(defaults).toMatchObject({
      agentId: null,
      durationMinutes: 30,
      status: "scheduled",
      notes: null,
    });
  });

  it("requires valid ids and a parseable scheduled time", () => {
    expect(viewingInputSchema.safeParse(viewing({ listingId: "nope" })).success).toBe(false);
    expect(viewingInputSchema.safeParse(viewing({ contactId: "" })).success).toBe(false);
    expect(viewingInputSchema.safeParse(viewing({ agentId: "nope" })).success).toBe(false);
    expect(viewingInputSchema.safeParse(viewing({ scheduledAt: "" })).success).toBe(false);
    expect(viewingInputSchema.safeParse(viewing({ scheduledAt: "not-a-date" })).success).toBe(
      false,
    );
  });

  it("bounds duration and status", () => {
    expect(viewingInputSchema.safeParse(viewing({ durationMinutes: "0" })).success).toBe(false);
    expect(viewingInputSchema.safeParse(viewing({ durationMinutes: "481" })).success).toBe(false);
    expect(viewingInputSchema.safeParse(viewing({ durationMinutes: "12.5" })).success).toBe(false);
    expect(viewingInputSchema.safeParse(viewing({ status: "pending" })).success).toBe(false);
    expect(viewingInputSchema.safeParse(viewing({ notes: "x".repeat(2001) })).success).toBe(false);
  });

  it("validates viewing status updates", () => {
    expect(
      viewingStatusSchema.parse({ viewingId: VIEWING_ID, status: "completed" }).status,
    ).toBe("completed");
    expect(
      viewingStatusSchema.safeParse({ viewingId: VIEWING_ID, status: "pending" }).success,
    ).toBe(false);
    expect(viewingStatusSchema.safeParse({ viewingId: "nope", status: "completed" }).success).toBe(
      false,
    );
  });
});

describe("workspace settings validation", () => {
  it("accepts a supported currency and time zone", () => {
    const parsed = workspaceSettingsSchema.parse({
      defaultCurrency: "eur",
      timeZone: "Europe/Athens",
    });
    expect(parsed).toEqual({ defaultCurrency: "EUR", timeZone: "Europe/Athens" });
  });

  it("rejects invalid currencies", () => {
    expect(
      workspaceSettingsSchema.safeParse({ defaultCurrency: "EU", timeZone: "UTC" }).success,
    ).toBe(false);
    expect(
      workspaceSettingsSchema.safeParse({ defaultCurrency: "12A", timeZone: "UTC" }).success,
    ).toBe(false);
    expect(
      workspaceSettingsSchema.safeParse({ defaultCurrency: "", timeZone: "UTC" }).success,
    ).toBe(false);
  });

  it("rejects unsupported time zones", () => {
    expect(
      workspaceSettingsSchema.safeParse({ defaultCurrency: "USD", timeZone: "Mars/Olympus" })
        .success,
    ).toBe(false);
    expect(
      workspaceSettingsSchema.safeParse({ defaultCurrency: "USD", timeZone: "" }).success,
    ).toBe(false);
    expect(workspaceSettingsSchema.safeParse({ defaultCurrency: "USD" }).success).toBe(false);
  });
});
