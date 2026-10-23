import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { count, sql } from "drizzle-orm";
import { db } from "@/db";
import { deals } from "@/db/schema";
import { resetDatabase } from "./helpers";
import { createContact, createListing, createUser } from "./factories";
import {
  createViewing,
  listContactViewings,
  listListingViewings,
  updateViewingStatus,
} from "@/lib/services/listing-viewings";
import { viewingInputSchema } from "@/lib/validation/listing-viewing";

function viewingInput(listingId: string, contactId: string, overrides: Record<string, unknown> = {}) {
  return viewingInputSchema.parse({
    listingId,
    contactId,
    scheduledAt: "2030-01-10T10:00:00.000Z",
    durationMinutes: "45",
    status: "scheduled",
    notes: "Meet at the lobby",
    ...overrides,
  });
}

async function fixture() {
  const admin = await createUser({ role: "admin", name: "Admin Agent" });
  const member = await createUser({ name: "Viewing Agent" });
  const seller = await createContact(admin.id, null, { firstName: "Elena", lastName: "Seller" });
  const listing = await createListing(seller.id, admin.id, { reference: "RE-VIEW-1" });
  const buyer = await createContact(admin.id, null, {
    firstName: "Nikos",
    lastName: "Buyer",
    email: "nikos.buyer@example.com",
  });
  return { admin, member, seller, listing, buyer };
}

describe("listing viewings", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("schedules a future viewing with the actor as the default agent", async () => {
    const { admin, listing, buyer } = await fixture();
    const viewing = await createViewing(viewingInput(listing.id, buyer.id), admin.id);

    expect(viewing).toMatchObject({
      listingId: listing.id,
      contactId: buyer.id,
      agentId: admin.id,
      durationMinutes: 45,
      status: "scheduled",
      notes: "Meet at the lobby",
      createdById: admin.id,
    });
    expect(viewing.scheduledAt.toISOString()).toBe("2030-01-10T10:00:00.000Z");

    const listed = await listListingViewings(listing.id);
    expect(listed.items).toHaveLength(1);
    expect(listed.upcoming.map((item) => item.id)).toEqual([viewing.id]);
    expect(listed.past).toHaveLength(0);
    expect(listed.upcoming[0].contactName).toBe("Nikos Buyer");
    expect(listed.upcoming[0].contactEmail).toBe("nikos.buyer@example.com");
    expect(listed.upcoming[0].agentName).toBe("Admin Agent");
    expect(listed.upcoming[0].agentStatus).toBe("active");
  });

  it("allows past viewings and separates upcoming from historical rows", async () => {
    const { admin, listing, buyer } = await fixture();
    const past = await createViewing(
      viewingInput(listing.id, buyer.id, { scheduledAt: "2020-01-10T10:00:00.000Z" }),
      admin.id,
    );
    const future = await createViewing(
      viewingInput(listing.id, buyer.id, { scheduledAt: "2030-01-10T10:00:00.000Z" }),
      admin.id,
    );

    const now = new Date("2026-01-01T00:00:00.000Z");
    const listed = await listListingViewings(listing.id, now);
    expect(listed.upcoming.map((item) => item.id)).toEqual([future.id]);
    expect(listed.past.map((item) => item.id)).toEqual([past.id]);
    expect(listed.items).toHaveLength(2);
  });

  it("stores multiple viewings for the same contact and listing", async () => {
    const { admin, listing, buyer } = await fixture();
    const first = await createViewing(
      viewingInput(listing.id, buyer.id, { scheduledAt: "2030-01-10T10:00:00.000Z" }),
      admin.id,
    );
    const second = await createViewing(
      viewingInput(listing.id, buyer.id, { scheduledAt: "2030-01-11T12:00:00.000Z" }),
      admin.id,
    );

    expect(first.id).not.toBe(second.id);
    const listed = await listListingViewings(listing.id);
    expect(listed.upcoming.map((item) => item.id)).toEqual([first.id, second.id]);
  });

  it("records viewing outcomes and moves them to history", async () => {
    const { admin, listing, buyer } = await fixture();
    const viewing = await createViewing(viewingInput(listing.id, buyer.id), admin.id);

    const completed = await updateViewingStatus(viewing.id, "completed");
    expect(completed.status).toBe("completed");
    expect(completed.id).toBe(viewing.id);

    const listed = await listListingViewings(listing.id);
    expect(listed.upcoming).toHaveLength(0);
    expect(listed.past.map((item) => item.id)).toEqual([viewing.id]);

    const cancelled = await updateViewingStatus(viewing.id, "cancelled");
    expect(cancelled.status).toBe("cancelled");
    const noShow = await updateViewingStatus(viewing.id, "no_show");
    expect(noShow.status).toBe("no_show");

    await expect(updateViewingStatus(randomUUID(), "completed")).rejects.toThrow("not found");
  });

  it("assigns an active agent and rejects an inactive agent", async () => {
    const { admin, member, listing, buyer } = await fixture();
    const assigned = await createViewing(
      viewingInput(listing.id, buyer.id, { agentId: member.id }),
      admin.id,
    );
    expect(assigned.agentId).toBe(member.id);

    const inactive = await createUser({ status: "inactive", name: "Former Agent" });
    await expect(
      createViewing(viewingInput(listing.id, buyer.id, { agentId: inactive.id }), admin.id),
    ).rejects.toThrow("active team member");
  });

  it("rejects missing listings, missing contacts, and invalid times", async () => {
    const { admin, listing, buyer } = await fixture();

    await expect(
      createViewing(viewingInput(randomUUID(), buyer.id), admin.id),
    ).rejects.toThrow("Listing not found");
    await expect(
      createViewing(viewingInput(listing.id, randomUUID()), admin.id),
    ).rejects.toThrow("Contact not found");
    await expect(
      createViewing(
        {
          ...viewingInput(listing.id, buyer.id),
          scheduledAt: "not-a-date",
        },
        admin.id,
      ),
    ).rejects.toThrow("valid viewing time");

    await expect(listListingViewings(randomUUID())).rejects.toThrow("not found");
    expect(await listContactViewings(randomUUID())).toEqual([]);
  });

  it("lists viewings for a contact with listing details", async () => {
    const { admin, seller, listing, buyer } = await fixture();
    const otherListing = await createListing(seller.id, admin.id, {
      reference: "RE-VIEW-2",
      title: "Second property",
    });
    await createViewing(
      viewingInput(listing.id, buyer.id, { scheduledAt: "2030-01-10T10:00:00.000Z" }),
      admin.id,
    );
    await createViewing(
      viewingInput(otherListing.id, buyer.id, { scheduledAt: "2030-02-10T10:00:00.000Z" }),
      admin.id,
    );

    const rows = await listContactViewings(buyer.id);
    expect(rows).toHaveLength(2);
    expect(rows[0].scheduledAt.toISOString()).toBe("2030-02-10T10:00:00.000Z");
    expect(rows[0]).toMatchObject({
      listingReference: "RE-VIEW-2",
      listingTitle: "Second property",
      listingStatus: "active",
      contactName: "Nikos Buyer",
    });
    expect(rows[1].listingReference).toBe("RE-VIEW-1");
  });

  it("does not create deals or tenancy records", async () => {
    const { admin, listing, buyer } = await fixture();
    const viewing = await createViewing(viewingInput(listing.id, buyer.id), admin.id);
    await updateViewingStatus(viewing.id, "completed");

    const [dealCount] = await db.select({ count: count() }).from(deals);
    expect(Number(dealCount.count)).toBe(0);

    const tenancyTables = await db.execute(
      sql`select table_name from information_schema.tables
          where table_schema = 'public'
            and (table_name like '%tenan%' or table_name like '%lease%')`,
    );
    expect(tenancyTables).toHaveLength(0);
  });
});
