import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "./helpers";
import { createUser } from "./factories";
import {
  activateCampaign,
  archiveSegment,
  createCampaign,
  createSegment,
  getCampaign,
  getSegment,
  listCampaigns,
  transitionCampaign,
  updateRecipientStatus,
  updateSegment,
} from "@/lib/services/marketing";
import { campaignSchema, segmentSchema } from "@/lib/validation/marketing";
import { companySchema } from "@/lib/validation/company";
import { contactSchema } from "@/lib/validation/contact";
import { createCompany } from "@/lib/services/companies";
import { createContact } from "@/lib/services/contacts";

async function fixture() {
  const admin = await createUser({ role: "admin" });
  const company = await createCompany(
    companySchema.parse({
      name: "Acme Software",
      industry: "Software",
      ownerId: admin.id,
    }),
    admin.id,
  );
  const contact = await createContact(
    contactSchema.parse({
      firstName: "Jordan",
      lastName: "Lee",
      email: "jordan@acme.test",
      companyId: company.id,
      ownerId: admin.id,
      tags: ["vip"],
      jobTitle: "VP Operations",
    }),
    admin.id,
  );
  const segment = await createSegment(
    segmentSchema.parse({
      name: "VIP software",
      criteria: { tags: ["vip"], industry: "Software" },
    }),
    admin.id,
  );
  return { admin, company, contact, segment };
}

describe("marketing campaigns", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("evaluates segment membership live", async () => {
    const { admin, company, segment } = await fixture();
    expect((await getSegment(segment.id))?.audienceCount).toBe(1);

    await createContact(
      contactSchema.parse({
        firstName: "Sam",
        lastName: "Rivera",
        email: "sam@acme.test",
        companyId: company.id,
        ownerId: admin.id,
        tags: ["vip"],
        jobTitle: "Director",
      }),
      admin.id,
    );
    expect((await getSegment(segment.id))?.audienceCount).toBe(2);
  });

  it("requires at least one segment criterion", () => {
    expect(() =>
      segmentSchema.parse({ name: "Everything", criteria: {} }),
    ).toThrow("validation.segmentCriteria");
  });

  it("snapshots the audience on activation", async () => {
    const { admin, company, contact, segment } = await fixture();
    const campaign = await createCampaign(
      campaignSchema.parse({
        name: "VIP outreach",
        channel: "email",
        segmentId: segment.id,
        ownerId: admin.id,
        budget: "1000",
        startDate: "2026-10-01",
        endDate: "2026-12-01",
      }),
      admin.id,
    );
    await activateCampaign(campaign.id, admin.id);
    const active = await getCampaign(campaign.id);
    expect(active?.status).toBe("active");
    expect(active?.recipients).toHaveLength(1);
    expect(active?.segmentSnapshot?.name).toBe("VIP software");

    await createContact(
      contactSchema.parse({
        firstName: "Sam",
        lastName: "Rivera",
        email: "sam@acme.test",
        companyId: company.id,
        ownerId: admin.id,
        tags: ["vip"],
        jobTitle: "Director",
      }),
      admin.id,
    );
    const afterContact = await getCampaign(campaign.id);
    expect(afterContact?.recipients).toHaveLength(1);

    await updateSegment(segment.id, {
      name: "VIP software renamed",
      description: null,
      criteria: { tags: ["vip", "renewal"], industry: "Software" },
    });
    const afterSegment = await getCampaign(campaign.id);
    expect(afterSegment?.recipients).toHaveLength(1);
    expect(afterSegment?.segmentSnapshot?.name).toBe("VIP software");

    await archiveSegment(segment.id, true);
    expect((await getCampaign(campaign.id))?.recipients).toHaveLength(1);
    void contact;
  });

  it("refuses to activate a campaign with an empty audience", async () => {
    const { admin } = await fixture();
    const empty = await createSegment(
      segmentSchema.parse({
        name: "No one",
        criteria: { industry: "Nonexistent" },
      }),
      admin.id,
    );
    const campaign = await createCampaign(
      campaignSchema.parse({
        name: "Empty",
        channel: "email",
        segmentId: empty.id,
        ownerId: admin.id,
      }),
      admin.id,
    );
    await expect(activateCampaign(campaign.id, admin.id)).rejects.toThrow("no matching contacts");
  });

  it("tracks recipient engagement and campaign metrics", async () => {
    const { admin, segment } = await fixture();
    const campaign = await createCampaign(
      campaignSchema.parse({
        name: "Metrics",
        channel: "email",
        segmentId: segment.id,
        ownerId: admin.id,
      }),
      admin.id,
    );
    await activateCampaign(campaign.id, admin.id);
    const active = await getCampaign(campaign.id);
    const recipient = active!.recipients[0].recipient;

    await updateRecipientStatus(recipient.id, "converted", admin.id);
    const updated = await getCampaign(campaign.id);
    expect(updated?.metrics.counts.converted).toBe(1);
    expect(updated?.metrics.responseRate).toBe(100);
    expect(updated?.metrics.conversionRate).toBe(100);
    expect(updated?.recipients[0].recipient.statusUpdatedById).toBe(admin.id);
  });

  it("enforces campaign lifecycle transitions", async () => {
    const { admin, segment } = await fixture();
    const campaign = await createCampaign(
      campaignSchema.parse({
        name: "Lifecycle",
        channel: "event",
        segmentId: segment.id,
        ownerId: admin.id,
      }),
      admin.id,
    );

    await expect(transitionCampaign(campaign.id, "completed", admin.id)).rejects.toThrow(
      "cannot move",
    );
    await activateCampaign(campaign.id, admin.id);
    await transitionCampaign(campaign.id, "completed", admin.id);
    await transitionCampaign(campaign.id, "archived", admin.id);
    await expect(
      updateRecipientStatus(
        (await getCampaign(campaign.id))!.recipients[0].recipient.id,
        "sent",
        admin.id,
      ),
    ).rejects.toThrow("read-only");
  });

  it("filters and sorts campaign lists", async () => {
    const { admin, segment } = await fixture();
    await createCampaign(
      campaignSchema.parse({
        name: "Alpha",
        channel: "email",
        segmentId: segment.id,
        ownerId: admin.id,
        startDate: "2026-10-01",
      }),
      admin.id,
    );
    await createCampaign(
      campaignSchema.parse({
        name: "Beta",
        channel: "phone",
        segmentId: segment.id,
        ownerId: admin.id,
        startDate: "2026-11-01",
      }),
      admin.id,
    );

    const email = await listCampaigns({
      q: "",
      channel: "email",
      sort: "name",
      page: 1,
      pageSize: 20,
    });
    expect(email.items.map((item) => item.name)).toEqual(["Alpha"]);

    const sorted = await listCampaigns({
      q: "",
      sort: "start_date",
      page: 1,
      pageSize: 20,
    });
    expect(sorted.items[0].name).toBe("Beta");
  });
});
