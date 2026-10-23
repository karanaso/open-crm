import { asc, count, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  activities,
  contacts,
  deals,
  listingPhotos,
  listings,
  listingViewings,
  tasks,
  workspaceSettings,
} from "@/db/schema";
import { ensureWorkspaceSettings } from "@/db/ensure-workspace-settings";
import { createContact, createListing, createTestPipeline, createUser } from "./factories";
import { resetDatabase } from "./helpers";

async function listingFixture() {
  const admin = await createUser({ role: "admin" });
  const member = await createUser();
  const seller = await createContact(admin.id, null, {
    firstName: "Elena",
    lastName: "Seller",
  });
  const buyer = await createContact(member.id, null, {
    firstName: "Nikos",
    lastName: "Buyer",
  });
  const listing = await createListing(seller.id, admin.id, {
    reference: "RE-TEST-001",
    title: "Test property",
    transaction: "sale",
    price: "250000.00",
    commissionAmount: "7500.00",
    currency: "EUR",
    propertyType: "apartment",
    features: {
      location: { viewOfCoast: true, gatedCommunity: true },
      yard: { swimmingPool: true },
      kitchen: { islands: true },
    },
  });
  return { admin, member, seller, buyer, listing };
}

describe("real estate schema", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("holds a single workspace settings row with USD and UTC defaults", async () => {
    const settings = await ensureWorkspaceSettings();
    expect(settings).toMatchObject({
      id: "default",
      defaultCurrency: "USD",
      timeZone: "UTC",
    });

    const repeated = await ensureWorkspaceSettings();
    expect(repeated?.id).toBe("default");

    const rows = await db.select().from(workspaceSettings);
    expect(rows).toHaveLength(1);

    await expect(
      db.execute(sql`insert into "workspace_settings" ("id") values ('other')`),
    ).rejects.toThrow();
  });

  it("stores grouped features and answers jsonb containment queries", async () => {
    const { admin, seller, listing } = await listingFixture();
    const other = await createListing(seller.id, admin.id, {
      reference: "RE-TEST-002",
      features: { kitchen: { islands: true } },
    });

    expect(listing.features).toEqual({
      location: { viewOfCoast: true, gatedCommunity: true },
      yard: { swimmingPool: true },
      kitchen: { islands: true },
    });

    const matches = await db
      .select({ id: listings.id })
      .from(listings)
      .where(
        sql`${listings.features} @> ${JSON.stringify({
          location: { viewOfCoast: true },
          yard: { swimmingPool: true },
        })}::jsonb`,
      );
    expect(matches.map((row) => row.id)).toEqual([listing.id]);

    const kitchenMatches = await db
      .select({ id: listings.id })
      .from(listings)
      .where(sql`${listings.features} @> ${JSON.stringify({ kitchen: { islands: true } })}::jsonb`)
      .orderBy(asc(listings.reference));
    expect(kitchenMatches.map((row) => row.id)).toEqual([listing.id, other.id]);
  });

  it("enforces listing price, period, currency, and year constraints", async () => {
    const { admin, seller } = await listingFixture();

    await expect(
      createListing(seller.id, admin.id, {
        reference: "RE-BAD-001",
        transaction: "sale",
        pricePeriod: "month",
      }),
    ).rejects.toThrow();

    await expect(
      createListing(seller.id, admin.id, {
        reference: "RE-BAD-002",
        transaction: "rent",
        pricePeriod: null,
      }),
    ).rejects.toThrow();

    await expect(
      createListing(seller.id, admin.id, { reference: "RE-BAD-003", price: "-1.00" }),
    ).rejects.toThrow();

    await expect(
      createListing(seller.id, admin.id, { reference: "RE-BAD-004", currency: "EU" }),
    ).rejects.toThrow();

    await expect(
      createListing(seller.id, admin.id, { reference: "RE-BAD-005", yearBuilt: 999 }),
    ).rejects.toThrow();

    const rent = await createListing(seller.id, admin.id, {
      reference: "RE-RENT-001",
      transaction: "rent",
      pricePeriod: "month",
      price: "1200.00",
    });
    expect(rent.pricePeriod).toBe("month");
  });

  it("orders photos by position and cascades them with the listing", async () => {
    const { seller, listing } = await listingFixture();

    await db.insert(listingPhotos).values([
      {
        listingId: listing.id,
        storageKey: `listings/${listing.id}/2_photo.webp`,
        mimeType: "image/webp",
        width: 1600,
        height: 1067,
        byteSize: 2048,
        position: 1,
        alt: "Second",
      },
      {
        listingId: listing.id,
        storageKey: `listings/${listing.id}/1_photo.webp`,
        mimeType: "image/webp",
        width: 1600,
        height: 1067,
        byteSize: 1024,
        position: 0,
        alt: "First",
      },
    ]);

    const ordered = await db
      .select({ alt: listingPhotos.alt, position: listingPhotos.position })
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, listing.id))
      .orderBy(asc(listingPhotos.position));
    expect(ordered).toEqual([
      { alt: "First", position: 0 },
      { alt: "Second", position: 1 },
    ]);

    await expect(
      db.insert(listingPhotos).values({
        listingId: listing.id,
        storageKey: `listings/${listing.id}/1_photo.webp`,
        mimeType: "image/webp",
        position: 2,
      }),
    ).rejects.toThrow();

    await expect(
      db.insert(listingPhotos).values({
        listingId: listing.id,
        storageKey: `listings/${listing.id}/negative.webp`,
        mimeType: "image/webp",
        position: -1,
      }),
    ).rejects.toThrow();

    await db.delete(listings).where(eq(listings.id, listing.id));
    const [remaining] = await db
      .select({ value: count() })
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, listing.id));
    expect(Number(remaining.value)).toBe(0);
    void seller;
  });

  it("schedules multiple viewings for a listing and contact", async () => {
    const { admin, member, seller, buyer, listing } = await listingFixture();

    const [first] = await db
      .insert(listingViewings)
      .values({
        listingId: listing.id,
        contactId: buyer.id,
        agentId: member.id,
        scheduledAt: new Date("2030-01-10T10:00:00Z"),
        durationMinutes: 45,
        status: "scheduled",
        createdById: admin.id,
      })
      .returning();
    const [second] = await db
      .insert(listingViewings)
      .values({
        listingId: listing.id,
        contactId: buyer.id,
        agentId: member.id,
        scheduledAt: new Date("2030-01-11T12:00:00Z"),
        durationMinutes: 30,
        status: "completed",
        createdById: admin.id,
      })
      .returning();

    expect(first.id).not.toBe(second.id);
    expect(first.status).toBe("scheduled");
    expect(second.status).toBe("completed");

    await expect(
      db.insert(listingViewings).values({
        listingId: listing.id,
        contactId: buyer.id,
        scheduledAt: new Date("2030-01-12T10:00:00Z"),
        durationMinutes: 0,
        createdById: admin.id,
      }),
    ).rejects.toThrow();

    await expect(db.delete(contacts).where(eq(contacts.id, seller.id))).rejects.toThrow();
    await expect(db.delete(contacts).where(eq(contacts.id, buyer.id))).rejects.toThrow();

    await db.delete(listings).where(eq(listings.id, listing.id));
    const [remaining] = await db
      .select({ value: count() })
      .from(listingViewings)
      .where(eq(listingViewings.listingId, listing.id));
    expect(Number(remaining.value)).toBe(0);
  });

  it("requires a deal contact, allows no company, and snapshots listing price", async () => {
    const { admin, seller, buyer, listing } = await listingFixture();
    const { pipeline, openStage } = await createTestPipeline();

    const [deal] = await db
      .insert(deals)
      .values({
        name: "Individual buyer deal",
        companyId: null,
        contactId: buyer.id,
        listingId: listing.id,
        propertyPrice: "250000.00",
        currency: "EUR",
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "7500.00",
      })
      .returning();

    expect(deal.companyId).toBeNull();
    expect(deal.contactId).toBe(buyer.id);
    expect(deal.listingId).toBe(listing.id);
    expect(deal.currency).toBe("EUR");
    expect(deal.propertyPrice).toBe("250000.00");
    expect(deal.amount).toBe("7500.00");

    await expect(
      db.execute(
        sql`insert into "deals" ("name", "company_id", "contact_id", "pipeline_id", "stage_id", "owner_id", "amount", "currency")
            values (${"No contact"}, null, null, ${pipeline.id}, ${openStage.id}, ${admin.id}, '0', 'USD')`,
      ),
    ).rejects.toThrow();

    await expect(
      db.insert(deals).values({
        name: "Negative property price",
        contactId: buyer.id,
        listingId: listing.id,
        propertyPrice: "-1.00",
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
      }),
    ).rejects.toThrow();
    void seller;
  });

  it("allows listing-only activities and tasks and rejects unlinked rows", async () => {
    const { admin, listing } = await listingFixture();

    const [activity] = await db
      .insert(activities)
      .values({
        type: "note",
        subject: "Listing-only activity",
        occurredAt: new Date("2026-01-10T10:00:00Z"),
        authorId: admin.id,
        listingId: listing.id,
      })
      .returning();
    expect(activity.listingId).toBe(listing.id);

    const [task] = await db
      .insert(tasks)
      .values({
        title: "Listing-only task",
        dueDate: "2030-01-10",
        createdById: admin.id,
        listingId: listing.id,
      })
      .returning();
    expect(task.listingId).toBe(listing.id);

    await expect(
      db.execute(
        sql`insert into "activities" ("type", "subject", "occurred_at", "author_id")
            values ('note', ${"No link"}, now(), ${admin.id})`,
      ),
    ).rejects.toThrow();

    await expect(
      db.execute(
        sql`insert into "tasks" ("title", "due_date", "created_by_id")
            values (${"No link"}, '2030-01-10', ${admin.id})`,
      ),
    ).rejects.toThrow();

    await db.delete(listings).where(eq(listings.id, listing.id));
    const [remainingActivities] = await db
      .select({ value: count() })
      .from(activities)
      .where(eq(activities.listingId, listing.id));
    const [remainingTasks] = await db
      .select({ value: count() })
      .from(tasks)
      .where(eq(tasks.listingId, listing.id));
    expect(Number(remainingActivities.value)).toBe(0);
    expect(Number(remainingTasks.value)).toBe(0);
  });
});
