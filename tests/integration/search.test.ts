import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "./helpers";
import { createContact, createListing, createTestPipeline, createUser } from "./factories";
import { globalSearch } from "@/lib/services/search";
import { createDeal } from "@/lib/services/deals";
import { dealSchema } from "@/lib/validation/deal";

describe("global search", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("finds active listings by reference, address, city, and seller name", async () => {
    const admin = await createUser({ role: "admin" });
    const seller = await createContact(admin.id, null, {
      firstName: "Nikos",
      lastName: "Pappas",
    });
    const listing = await createListing(seller.id, admin.id, {
      reference: "RE-ALPHA-1",
      title: "Seafront apartment",
      addressLine1: "12 Seafront Avenue",
      city: "Piraeus",
    });

    const byReference = await globalSearch("RE-ALPHA-1");
    expect(byReference.listings).toHaveLength(1);
    expect(byReference.listings[0].id).toBe(listing.id);
    expect(byReference.listings[0].title).toBe("Seafront apartment");
    expect(byReference.listings[0].subtitle).toContain("RE-ALPHA-1");
    expect(byReference.listings[0].href).toBe(`/listings/${listing.id}`);

    expect((await globalSearch("Seafront Avenue")).listings).toHaveLength(1);
    expect((await globalSearch("Piraeus")).listings).toHaveLength(1);
    expect((await globalSearch("Pappas")).listings).toHaveLength(1);
  });

  it("excludes inactive listings and caps the listing group at five", async () => {
    const admin = await createUser({ role: "admin" });
    const seller = await createContact(admin.id, null);
    for (let index = 0; index < 6; index += 1) {
      await createListing(seller.id, admin.id, {
        reference: `RE-VILLA-${index}`,
        title: `Villa ${index}`,
      });
    }
    await createListing(seller.id, admin.id, {
      reference: "RE-HIDDEN",
      title: "Hidden villa",
      status: "inactive",
    });

    const results = await globalSearch("Villa");
    expect(results.listings).toHaveLength(5);
    expect(results.listings.some((result) => result.title === "Hidden villa")).toBe(false);
  });

  it("finds deals by contact name without requiring a company", async () => {
    const admin = await createUser({ role: "admin" });
    const buyer = await createContact(admin.id, null, {
      firstName: "Elena",
      lastName: "Individual",
    });
    const { pipeline, openStage } = await createTestPipeline();
    const deal = await createDeal(
      dealSchema.parse({
        name: "Elena offer",
        contactId: buyer.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "1500",
        currency: "EUR",
      }),
      admin.id,
    );

    const results = await globalSearch("Elena");
    expect(results.deals).toHaveLength(1);
    expect(results.deals[0].id).toBe(deal.id);
    expect(results.deals[0].subtitle).toContain("Elena Individual");
    expect(results.deals[0].currency).toBe("EUR");
  });

  it("returns no groups for a one-character query", async () => {
    const admin = await createUser({ role: "admin" });
    const seller = await createContact(admin.id, null);
    await createListing(seller.id, admin.id, { title: "Villa" });

    const results = await globalSearch("V");
    expect(Object.values(results).every((group) => group.length === 0)).toBe(true);
  });
});
