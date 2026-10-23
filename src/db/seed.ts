import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db";
import { imageStorageDir } from "@/lib/env";
import {
  activities,
  campaignRecipients,
  campaigns,
  companies,
  companyTags,
  contacts,
  contactTags,
  deals,
  listingPhotos,
  listings,
  listingViewings,
  segments,
  tags,
  tasks,
  ticketComments,
  tickets,
  users,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { ensureDefaultPipeline, DEFAULT_PIPELINE_ID } from "@/db/ensure-default-pipeline";
import { ensureWorkspaceSettings } from "@/db/ensure-workspace-settings";

const ADMIN_ID = "10000000-0000-4000-8000-000000000001";
const MEMBER_ID = "10000000-0000-4000-8000-000000000002";
const COMPANY_ACME = "20000000-0000-4000-8000-000000000001";
const COMPANY_NORTHWIND = "20000000-0000-4000-8000-000000000002";
const COMPANY_BLUEHARBOR = "20000000-0000-4000-8000-000000000003";
const SELLER_CONTACT_ID = "40000000-0000-4000-8000-000000000005";
const BUYER_CONTACT_ID = "40000000-0000-4000-8000-000000000006";
const SALE_LISTING_ID = "b0000000-0000-4000-8000-000000000001";
const RENT_LISTING_ID = "b0000000-0000-4000-8000-000000000002";

const SEED_LISTING_PHOTOS = [
  {
    storageKey: `listings/${SALE_LISTING_ID}/1_seed0001.webp`,
    background: "#dbeafe",
  },
  {
    storageKey: `listings/${SALE_LISTING_ID}/2_seed0002.webp`,
    background: "#fef3c7",
  },
  {
    storageKey: `listings/${RENT_LISTING_ID}/1_seed0003.webp`,
    background: "#dcfce7",
  },
] as const;

async function writeSeedListingPhotos() {
  await Promise.all(
    SEED_LISTING_PHOTOS.map(async (photo) => {
      const absolute = path.join(imageStorageDir, photo.storageKey);
      await mkdir(path.dirname(absolute), { recursive: true });
      const data = await sharp({
        create: {
          width: 1600,
          height: 1067,
          channels: 3,
          background: photo.background,
        },
      })
        .webp({ quality: 78 })
        .toBuffer();
      await writeFile(absolute, data);
    }),
  );
}

async function seed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo data in production.");
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "AdminPassword123!";
  const memberPassword = process.env.SEED_MEMBER_PASSWORD ?? "MemberPassword123!";
  const now = new Date();

  await ensureDefaultPipeline();
  await ensureWorkspaceSettings();

  await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values([
        {
          id: ADMIN_ID,
          email: "admin@opencrm.local",
          name: "Alex Morgan",
          passwordHash: await hashPassword(adminPassword),
          role: "admin",
          status: "active",
          updatedAt: now,
        },
        {
          id: MEMBER_ID,
          email: "member@opencrm.local",
          name: "Priya Shah",
          passwordHash: await hashPassword(memberPassword),
          role: "member",
          status: "active",
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(companies)
      .values([
        {
          id: COMPANY_ACME,
          name: "Acme Software",
          domain: "acme.com",
          industry: "Software",
          employeeCount: 240,
          phone: "+1 415 555 0101",
          website: "https://acme.com",
          city: "San Francisco",
          region: "CA",
          country: "United States",
          ownerId: ADMIN_ID,
          description: "Mid-market SaaS platform for operations teams.",
          updatedAt: now,
        },
        {
          id: COMPANY_NORTHWIND,
          name: "Northwind Logistics",
          domain: "northwind.example",
          industry: "Logistics",
          employeeCount: 1200,
          phone: "+1 312 555 0110",
          city: "Chicago",
          region: "IL",
          country: "United States",
          ownerId: MEMBER_ID,
          description: "Regional freight and warehouse operator.",
          updatedAt: now,
        },
        {
          id: COMPANY_BLUEHARBOR,
          name: "Blue Harbor Media",
          domain: "blueharbor.example",
          industry: "Media",
          employeeCount: 85,
          city: "Portland",
          region: "ME",
          country: "United States",
          ownerId: ADMIN_ID,
          description: "Independent media group with regional publications.",
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(tags)
      .values([
        { id: "30000000-0000-4000-8000-000000000001", name: "vip" },
        { id: "30000000-0000-4000-8000-000000000002", name: "enterprise" },
        { id: "30000000-0000-4000-8000-000000000003", name: "renewal" },
      ])
      .onConflictDoNothing();

    await tx
      .insert(companyTags)
      .values([
        { companyId: COMPANY_ACME, tagId: "30000000-0000-4000-8000-000000000001" },
        { companyId: COMPANY_ACME, tagId: "30000000-0000-4000-8000-000000000002" },
        { companyId: COMPANY_NORTHWIND, tagId: "30000000-0000-4000-8000-000000000003" },
      ])
      .onConflictDoNothing();

    await tx
      .insert(contacts)
      .values([
        {
          id: "40000000-0000-4000-8000-000000000001",
          firstName: "Jordan",
          lastName: "Lee",
          email: "jordan.lee@acme.com",
          phone: "+1 415 555 0121",
          jobTitle: "VP Operations",
          companyId: COMPANY_ACME,
          ownerId: ADMIN_ID,
          notes: "Primary champion for the operations rollout.",
          updatedAt: now,
        },
        {
          id: "40000000-0000-4000-8000-000000000002",
          firstName: "Sam",
          lastName: "Rivera",
          email: "sam.rivera@acme.com",
          jobTitle: "Director of Finance",
          companyId: COMPANY_ACME,
          ownerId: MEMBER_ID,
          updatedAt: now,
        },
        {
          id: "40000000-0000-4000-8000-000000000003",
          firstName: "Morgan",
          lastName: "Chen",
          email: "morgan.chen@northwind.example",
          phone: "+1 312 555 0132",
          jobTitle: "Head of Procurement",
          companyId: COMPANY_NORTHWIND,
          ownerId: MEMBER_ID,
          updatedAt: now,
        },
        {
          id: "40000000-0000-4000-8000-000000000004",
          firstName: "Riley",
          lastName: "Brooks",
          email: "riley.brooks@blueharbor.example",
          jobTitle: "Managing Editor",
          companyId: COMPANY_BLUEHARBOR,
          ownerId: ADMIN_ID,
          updatedAt: now,
        },
        {
          id: SELLER_CONTACT_ID,
          firstName: "Elena",
          lastName: "Papadopoulou",
          email: "elena.papadopoulou@example.com",
          phone: "+30 210 555 0140",
          ownerId: ADMIN_ID,
          notes: "Individual seller for the Glyfada and Kolonaki properties.",
          updatedAt: now,
        },
        {
          id: BUYER_CONTACT_ID,
          firstName: "Nikos",
          lastName: "Georgiou",
          email: "nikos.georgiou@example.com",
          phone: "+30 694 555 0142",
          ownerId: MEMBER_ID,
          notes: "Individual buyer and tenant; no company affiliation.",
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(contactTags)
      .values([
        {
          contactId: "40000000-0000-4000-8000-000000000001",
          tagId: "30000000-0000-4000-8000-000000000001",
        },
        {
          contactId: "40000000-0000-4000-8000-000000000001",
          tagId: "30000000-0000-4000-8000-000000000002",
        },
        {
          contactId: "40000000-0000-4000-8000-000000000003",
          tagId: "30000000-0000-4000-8000-000000000003",
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(listings)
      .values([
        {
          id: SALE_LISTING_ID,
          reference: "RE-S-001",
          title: "Seafront villa in Glyfada",
          description:
            "Five-bedroom villa with a private pool and direct sea views, close to the marina.",
          transaction: "sale",
          status: "active",
          price: "1250000.00",
          commissionAmount: "37500.00",
          currency: "EUR",
          addressLine1: "12 Poseidonos Avenue",
          city: "Athens",
          region: "Attica",
          postalCode: "16674",
          country: "Greece",
          propertyType: "villa",
          bedrooms: 5,
          bathrooms: "4.5",
          sizeSqm: "320.00",
          lotSqm: "600.00",
          yearBuilt: 2008,
          floors: 2,
          parking: 2,
          energyClass: "a",
          sellerContactId: SELLER_CONTACT_ID,
          ownerId: ADMIN_ID,
          features: {
            location: { viewOfCoast: true, gatedCommunity: true },
            yard: { swimmingPool: true, spa: true },
            kitchen: { islands: true },
          },
          listedAt: new Date("2026-09-01T08:00:00Z"),
          updatedAt: now,
        },
        {
          id: RENT_LISTING_ID,
          reference: "RE-R-002",
          title: "Two-bedroom apartment in Kolonaki",
          description:
            "Renovated upper-floor apartment with a balcony, lift access, and a short walk to the metro.",
          transaction: "rent",
          status: "active",
          price: "1800.00",
          pricePeriod: "month",
          commissionAmount: "1800.00",
          currency: "EUR",
          addressLine1: "8 Skoufa Street",
          city: "Athens",
          region: "Attica",
          postalCode: "10673",
          country: "Greece",
          propertyType: "apartment",
          bedrooms: 2,
          bathrooms: "1.0",
          sizeSqm: "85.00",
          yearBuilt: 1995,
          floors: 1,
          parking: 1,
          energyClass: "c",
          sellerContactId: SELLER_CONTACT_ID,
          ownerId: MEMBER_ID,
          features: {
            location: { gatedCommunity: true },
            kitchen: { islands: true },
          },
          listedAt: new Date("2026-10-01T08:00:00Z"),
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(listingPhotos)
      .values([
        {
          id: "b1000000-0000-4000-8000-000000000001",
          listingId: SALE_LISTING_ID,
          storageKey: `listings/${SALE_LISTING_ID}/1_seed0001.webp`,
          mimeType: "image/webp",
          width: 1600,
          height: 1067,
          byteSize: 184320,
          position: 0,
          alt: "Sea-facing villa exterior",
          updatedAt: now,
        },
        {
          id: "b1000000-0000-4000-8000-000000000002",
          listingId: SALE_LISTING_ID,
          storageKey: `listings/${SALE_LISTING_ID}/2_seed0002.webp`,
          mimeType: "image/webp",
          width: 1600,
          height: 1067,
          byteSize: 201728,
          position: 1,
          alt: "Villa living room",
          updatedAt: now,
        },
        {
          id: "b1000000-0000-4000-8000-000000000003",
          listingId: RENT_LISTING_ID,
          storageKey: `listings/${RENT_LISTING_ID}/1_seed0003.webp`,
          mimeType: "image/webp",
          width: 1600,
          height: 1067,
          byteSize: 158720,
          position: 0,
          alt: "Kolonaki apartment balcony",
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(listingViewings)
      .values([
        {
          id: "b2000000-0000-4000-8000-000000000001",
          listingId: RENT_LISTING_ID,
          contactId: BUYER_CONTACT_ID,
          agentId: MEMBER_ID,
          scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          durationMinutes: 45,
          status: "scheduled",
          notes: "Tenant wants to measure the living room for furniture.",
          createdById: ADMIN_ID,
          updatedAt: now,
        },
        {
          id: "b2000000-0000-4000-8000-000000000002",
          listingId: SALE_LISTING_ID,
          contactId: BUYER_CONTACT_ID,
          agentId: ADMIN_ID,
          scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          durationMinutes: 30,
          status: "completed",
          notes: "Second viewing completed; buyer asked about the pool maintenance contract.",
          createdById: ADMIN_ID,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(deals)
      .values([
        {
          id: "50000000-0000-4000-8000-000000000001",
          name: "Acme operations platform",
          companyId: COMPANY_ACME,
          contactId: "40000000-0000-4000-8000-000000000001",
          pipelineId: DEFAULT_PIPELINE_ID,
          stageId: "00000000-0000-4000-8000-000000000103",
          ownerId: ADMIN_ID,
          amount: "48000.00",
          expectedCloseDate: "2026-11-15",
          status: "open",
          description: "Annual platform subscription for the operations team.",
          updatedAt: now,
        },
        {
          id: "50000000-0000-4000-8000-000000000002",
          name: "Acme analytics add-on",
          companyId: COMPANY_ACME,
          contactId: "40000000-0000-4000-8000-000000000002",
          pipelineId: DEFAULT_PIPELINE_ID,
          stageId: "00000000-0000-4000-8000-000000000102",
          ownerId: MEMBER_ID,
          amount: "12500.00",
          expectedCloseDate: "2026-12-05",
          status: "open",
          updatedAt: now,
        },
        {
          id: "50000000-0000-4000-8000-000000000003",
          name: "Northwind procurement rollout",
          companyId: COMPANY_NORTHWIND,
          contactId: "40000000-0000-4000-8000-000000000003",
          pipelineId: DEFAULT_PIPELINE_ID,
          stageId: "00000000-0000-4000-8000-000000000104",
          ownerId: MEMBER_ID,
          amount: "86000.00",
          expectedCloseDate: "2026-11-28",
          status: "open",
          updatedAt: now,
        },
        {
          id: "50000000-0000-4000-8000-000000000004",
          name: "Blue Harbor newsroom pilot",
          companyId: COMPANY_BLUEHARBOR,
          contactId: "40000000-0000-4000-8000-000000000004",
          pipelineId: DEFAULT_PIPELINE_ID,
          stageId: "00000000-0000-4000-8000-000000000101",
          ownerId: ADMIN_ID,
          amount: "7200.00",
          expectedCloseDate: "2027-01-20",
          status: "open",
          updatedAt: now,
        },
        {
          id: "50000000-0000-4000-8000-000000000005",
          name: "Acme pilot expansion",
          companyId: COMPANY_ACME,
          contactId: "40000000-0000-4000-8000-000000000001",
          pipelineId: DEFAULT_PIPELINE_ID,
          stageId: "00000000-0000-4000-8000-000000000105",
          ownerId: ADMIN_ID,
          amount: "24000.00",
          expectedCloseDate: "2026-10-10",
          status: "won",
          closedAt: new Date("2026-10-10T15:00:00Z"),
          updatedAt: now,
        },
        {
          id: "50000000-0000-4000-8000-000000000006",
          name: "Blue Harbor enterprise plan",
          companyId: COMPANY_BLUEHARBOR,
          contactId: "40000000-0000-4000-8000-000000000004",
          pipelineId: DEFAULT_PIPELINE_ID,
          stageId: "00000000-0000-4000-8000-000000000106",
          ownerId: MEMBER_ID,
          amount: "15000.00",
          expectedCloseDate: "2026-09-30",
          status: "lost",
          closedAt: new Date("2026-09-30T12:00:00Z"),
          lostReason: "Budget postponed to next fiscal year.",
          updatedAt: now,
        },
        {
          id: "50000000-0000-4000-8000-000000000007",
          name: "Kolonaki apartment rental offer",
          companyId: null,
          contactId: BUYER_CONTACT_ID,
          listingId: RENT_LISTING_ID,
          propertyPrice: "1800.00",
          currency: "EUR",
          pipelineId: DEFAULT_PIPELINE_ID,
          stageId: "00000000-0000-4000-8000-000000000102",
          ownerId: MEMBER_ID,
          amount: "1800.00",
          expectedCloseDate: "2026-12-01",
          status: "open",
          description: "Individual tenant offer for the Kolonaki apartment.",
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(tickets)
      .values([
        {
          id: "60000000-0000-4000-8000-000000000001",
          subject: "SSO login loop for finance team",
          description:
            "Finance users are redirected back to the login screen after authenticating with SSO.",
          requesterContactId: "40000000-0000-4000-8000-000000000002",
          assigneeId: ADMIN_ID,
          createdById: ADMIN_ID,
          priority: "urgent",
          status: "in_progress",
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
          updatedAt: now,
        },
        {
          id: "60000000-0000-4000-8000-000000000002",
          subject: "Export report formatting",
          description: "The procurement export loses column headers when opened in Excel.",
          requesterContactId: "40000000-0000-4000-8000-000000000003",
          assigneeId: MEMBER_ID,
          createdById: MEMBER_ID,
          priority: "normal",
          status: "open",
          createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
          updatedAt: now,
        },
        {
          id: "60000000-0000-4000-8000-000000000003",
          subject: "Billing address update",
          description: "Please update the billing address on the account.",
          requesterContactId: "40000000-0000-4000-8000-000000000004",
          createdById: ADMIN_ID,
          priority: "low",
          status: "resolved",
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          firstResponseAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(ticketComments)
      .values([
        {
          id: "61000000-0000-4000-8000-000000000001",
          ticketId: "60000000-0000-4000-8000-000000000001",
          authorId: ADMIN_ID,
          body: "We are investigating the SSO callback. Could you confirm the identity provider?",
          visibility: "reply",
        },
        {
          id: "61000000-0000-4000-8000-000000000002",
          ticketId: "60000000-0000-4000-8000-000000000001",
          authorId: ADMIN_ID,
          body: "Check the tenant-level SSO configuration before replying.",
          visibility: "internal",
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(segments)
      .values({
        id: "70000000-0000-4000-8000-000000000001",
        name: "VIP software contacts",
        description: "High-touch contacts at software companies.",
        criteria: { tags: ["vip"], industry: "Software" },
        createdById: ADMIN_ID,
        updatedAt: now,
      })
      .onConflictDoNothing();

    await tx
      .insert(campaigns)
      .values({
        id: "80000000-0000-4000-8000-000000000001",
        name: "Q4 VIP outreach",
        channel: "email",
        status: "active",
        segmentId: "70000000-0000-4000-8000-000000000001",
        ownerId: ADMIN_ID,
        budget: "2500.00",
        startDate: "2026-10-15",
        endDate: "2026-12-15",
        description: "Quarterly check-in with our highest-value software contacts.",
        segmentSnapshot: {
          name: "VIP software contacts",
          criteria: { tags: ["vip"], industry: "Software" },
        },
        activatedAt: new Date("2026-10-15T09:00:00Z"),
        updatedAt: now,
      })
      .onConflictDoNothing();

    await tx
      .insert(campaignRecipients)
      .values([
        {
          id: "81000000-0000-4000-8000-000000000001",
          campaignId: "80000000-0000-4000-8000-000000000001",
          contactId: "40000000-0000-4000-8000-000000000001",
          status: "responded",
          statusUpdatedById: ADMIN_ID,
          statusUpdatedAt: new Date("2026-10-18T11:00:00Z"),
        },
        {
          id: "81000000-0000-4000-8000-000000000002",
          campaignId: "80000000-0000-4000-8000-000000000001",
          contactId: "40000000-0000-4000-8000-000000000002",
          status: "sent",
          statusUpdatedById: MEMBER_ID,
          statusUpdatedAt: new Date("2026-10-16T09:30:00Z"),
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(activities)
      .values([
        {
          id: "90000000-0000-4000-8000-000000000001",
          type: "call",
          subject: "Discovery call with Jordan",
          body: "Discussed the operations workflow and the reporting requirements.",
          occurredAt: new Date("2026-10-14T15:00:00Z"),
          authorId: ADMIN_ID,
          companyId: COMPANY_ACME,
          contactId: "40000000-0000-4000-8000-000000000001",
          dealId: "50000000-0000-4000-8000-000000000001",
        },
        {
          id: "90000000-0000-4000-8000-000000000002",
          type: "meeting",
          subject: "Procurement rollout planning",
          body: "Reviewed the rollout timeline and stakeholder map.",
          occurredAt: new Date("2026-10-12T10:00:00Z"),
          authorId: MEMBER_ID,
          companyId: COMPANY_NORTHWIND,
          contactId: "40000000-0000-4000-8000-000000000003",
          dealId: "50000000-0000-4000-8000-000000000003",
        },
        {
          id: "90000000-0000-4000-8000-000000000003",
          type: "note",
          subject: "Newsroom pilot notes",
          body: "Riley wants a small pilot before the annual planning cycle.",
          occurredAt: new Date("2026-10-09T13:30:00Z"),
          authorId: ADMIN_ID,
          companyId: COMPANY_BLUEHARBOR,
          contactId: "40000000-0000-4000-8000-000000000004",
        },
        {
          id: "90000000-0000-4000-8000-000000000004",
          type: "meeting",
          subject: "Villa viewing with the Georgiou family",
          body: "Walked through the villa and discussed the pool maintenance contract.",
          occurredAt: new Date("2026-10-18T12:00:00Z"),
          authorId: ADMIN_ID,
          listingId: SALE_LISTING_ID,
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(tasks)
      .values([
        {
          id: "a0000000-0000-4000-8000-000000000001",
          title: "Send Acme the implementation plan",
          description: "Include the data migration checklist and a two-week timeline.",
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          priority: "high",
          status: "open",
          assigneeId: ADMIN_ID,
          createdById: ADMIN_ID,
          contactId: "40000000-0000-4000-8000-000000000001",
          dealId: "50000000-0000-4000-8000-000000000001",
        },
        {
          id: "a0000000-0000-4000-8000-000000000002",
          title: "Follow up on SSO ticket",
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          priority: "normal",
          status: "open",
          assigneeId: MEMBER_ID,
          createdById: ADMIN_ID,
          ticketId: "60000000-0000-4000-8000-000000000001",
        },
        {
          id: "a0000000-0000-4000-8000-000000000003",
          title: "Review Q4 campaign responses",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          priority: "low",
          status: "open",
          assigneeId: ADMIN_ID,
          createdById: ADMIN_ID,
          campaignId: "80000000-0000-4000-8000-000000000001",
        },
        {
          id: "a0000000-0000-4000-8000-000000000004",
          title: "Prepare Kolonaki rental offer summary",
          description: "Share the rent, commission, and available move-in date with the tenant.",
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          priority: "normal",
          status: "open",
          assigneeId: MEMBER_ID,
          createdById: ADMIN_ID,
          listingId: RENT_LISTING_ID,
        },
      ])
      .onConflictDoNothing();

    await tx.execute(sql`select 1`);
  });

  await writeSeedListingPhotos();

  console.log("Seed complete.");
  console.log("Admin: admin@opencrm.local / AdminPassword123!");
  console.log("Member: member@opencrm.local / MemberPassword123!");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
