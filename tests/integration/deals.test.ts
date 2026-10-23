import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "./helpers";
import {
  createCompany,
  createContact,
  createListing,
  createTestPipeline,
  createUser,
} from "./factories";
import {
  archivePipeline,
  createPipeline,
  deleteStage,
  getDefaultPipeline,
  getPipeline,
  reorderStages,
  setDefaultPipeline,
} from "@/lib/services/pipelines";
import {
  createDeal,
  getDeal,
  getDealsForBoard,
  getPipelineMetrics,
  listDeals,
  moveDeal,
  updateDeal,
} from "@/lib/services/deals";
import { dealListParamsSchema, dealSchema } from "@/lib/validation/deal";
import { companySchema } from "@/lib/validation/company";
import { createCompany as createCompanyService } from "@/lib/services/companies";

async function fixture() {
  const admin = await createUser({ role: "admin" });
  const company = await createCompany(admin.id, { name: "Acme" });
  const contact = await createContact(admin.id, company.id, {
    firstName: "Jordan",
    lastName: "Lee",
    email: "jordan@acme.test",
  });
  const otherCompany = await createCompany(admin.id, { name: "Other" });
  const { pipeline, openStage, wonStage, lostStage } = await createTestPipeline();
  return { admin, company, contact, otherCompany, pipeline, openStage, wonStage, lostStage };
}

describe("sales pipeline", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("seeds and protects the default pipeline", async () => {
    const defaultPipeline = await getDefaultPipeline();
    expect(defaultPipeline?.name).toBe("Sales Pipeline");
    expect(defaultPipeline?.stages.map((stage) => stage.name)).toEqual([
      "Lead",
      "Qualified",
      "Proposal",
      "Negotiation",
      "Won",
      "Lost",
    ]);
    await expect(archivePipeline(defaultPipeline!.id)).rejects.toThrow("default pipeline");
  });

  it("creates a pipeline with all required outcomes", async () => {
    const pipeline = await createPipeline("Partnerships");
    const loaded = await getPipeline(pipeline.id);
    expect(loaded?.stages).toHaveLength(6);
    expect(new Set(loaded?.stages.map((stage) => stage.outcome))).toEqual(
      new Set(["open", "won", "lost"]),
    );
  });

  it("changes the default pipeline", async () => {
    const second = await createPipeline("Second");
    await setDefaultPipeline(second.id);
    const defaultPipeline = await getDefaultPipeline();
    expect(defaultPipeline?.id).toBe(second.id);
  });

  it("rejects a stage that belongs to another pipeline", async () => {
    const { admin, contact, pipeline, wonStage } = await fixture();
    const other = await createTestPipeline();
    await expect(
      createDeal(
        dealSchema.parse({
          name: "Mismatch",
          contactId: contact.id,
          pipelineId: pipeline.id,
          stageId: other.openStage.id,
          ownerId: admin.id,
          amount: "1000",
        }),
        admin.id,
      ),
    ).rejects.toThrow("does not belong");
    void wonStage;
  });

  it("rejects a contact from another company", async () => {
    const { admin, company, otherCompany, pipeline, openStage } = await fixture();
    const outsider = await createContact(admin.id, otherCompany.id);
    await expect(
      createDeal(
        dealSchema.parse({
          name: "Mismatch",
          companyId: company.id,
          contactId: outsider.id,
          pipelineId: pipeline.id,
          stageId: openStage.id,
          ownerId: admin.id,
          amount: "1000",
        }),
        admin.id,
      ),
    ).rejects.toThrow("must belong to the selected company");
  });

  it("creates an individual buyer deal without a company", async () => {
    const { admin, pipeline, openStage } = await fixture();
    const individual = await createContact(admin.id, null, {
      firstName: "Nora",
      lastName: "Solo",
    });
    const deal = await createDeal(
      dealSchema.parse({
        name: "Individual buyer",
        contactId: individual.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "1500",
      }),
      admin.id,
    );

    expect(deal.companyId).toBeNull();
    expect(deal.contactId).toBe(individual.id);
    expect(deal.currency).toBe("USD");

    const loaded = await getDeal(deal.id);
    expect(loaded?.companyName).toBeNull();
    expect(loaded?.contactName).toBe("Nora Solo");

    const board = await getDealsForBoard(pipeline.id);
    const card = board.find((item) => item.id === deal.id);
    expect(card?.companyName).toBeNull();
    expect(card?.contactName).toBe("Nora Solo");
  });

  it("applies listing defaults to a linked deal", async () => {
    const { admin, contact, pipeline, openStage } = await fixture();
    const listing = await createListing(contact.id, admin.id, {
      reference: "RE-SEA-1",
      title: "Seafront apartment",
      price: "250000.00",
      currency: "EUR",
      commissionAmount: "3000.00",
    });

    const deal = await createDeal(
      dealSchema.parse({
        name: "Seafront offer",
        contactId: contact.id,
        listingId: listing.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
      }),
      admin.id,
    );

    expect(deal.listingId).toBe(listing.id);
    expect(deal.currency).toBe("EUR");
    expect(deal.propertyPrice).toBe("250000.00");
    expect(deal.amount).toBe("3000.00");

    const loaded = await getDeal(deal.id);
    expect(loaded?.listingTitle).toBe("Seafront apartment");
    expect(loaded?.listingReference).toBe("RE-SEA-1");
    expect(loaded?.contactName).toBe("Jordan Lee");
  });

  it("validates contact, money, and currency input", () => {
    const base = {
      name: "Validation",
      pipelineId: randomUUID(),
      stageId: randomUUID(),
      contactId: randomUUID(),
    };
    expect(() => dealSchema.parse({ ...base, contactId: undefined })).toThrow(
      "validation.selectContact",
    );
    expect(() => dealSchema.parse({ ...base, amount: -1 })).toThrow();
    expect(() => dealSchema.parse({ ...base, amount: 1.234 })).toThrow();
    expect(() => dealSchema.parse({ ...base, propertyPrice: -1 })).toThrow();
    expect(() => dealSchema.parse({ ...base, currency: "US" })).toThrow();
    expect(dealSchema.parse({ ...base, currency: "eur" }).currency).toBe("EUR");
    expect(dealSchema.parse(base).propertyPrice).toBeNull();
  });

  it("filters deals by contact name and currency", async () => {
    const { admin, company, contact, pipeline, openStage } = await fixture();
    const individual = await createContact(admin.id, null, {
      firstName: "Elena",
      lastName: "Euro",
    });
    await createDeal(
      dealSchema.parse({
        name: "Individual EUR deal",
        contactId: individual.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "900",
        currency: "EUR",
      }),
      admin.id,
    );
    await createDeal(
      dealSchema.parse({
        name: "Company USD deal",
        companyId: company.id,
        contactId: contact.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "1200",
      }),
      admin.id,
    );

    const byContact = await listDeals(dealListParamsSchema.parse({ q: "Elena" }));
    expect(byContact.items).toHaveLength(1);
    expect(byContact.items[0].contactName).toBe("Elena Euro");
    expect(byContact.items[0].companyName).toBeNull();

    const byCurrency = await listDeals(dealListParamsSchema.parse({ currency: "EUR" }));
    expect(byCurrency.items).toHaveLength(1);
    expect(byCurrency.items[0].currency).toBe("EUR");

    const sorted = await listDeals(
      dealListParamsSchema.parse({ currency: "USD", sort: "amount_desc" }),
    );
    expect(sorted.items[0].amount).toBe("1200.00");
  });

  it("moves a deal through won and reopens it", async () => {
    const { admin, company, contact, pipeline, openStage, wonStage } = await fixture();
    const deal = await createDeal(
      dealSchema.parse({
        name: "Acme deal",
        companyId: company.id,
        contactId: contact.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "10000",
      }),
      admin.id,
    );

    const won = await moveDeal(
      {
        dealId: deal.id,
        stageId: wonStage.id,
        expectedUpdatedAt: deal.updatedAt.toISOString(),
      },
      admin.id,
    );
    expect(won.status).toBe("won");
    expect(won.closedAt).not.toBeNull();

    const reopened = await moveDeal(
      {
        dealId: deal.id,
        stageId: openStage.id,
        expectedUpdatedAt: won.updatedAt.toISOString(),
      },
      admin.id,
    );
    expect(reopened.status).toBe("open");
    expect(reopened.closedAt).toBeNull();
    expect(reopened.lostReason).toBeNull();
  });

  it("requires a reason when moving to lost", async () => {
    const { admin, company, contact, pipeline, openStage, lostStage } = await fixture();
    const deal = await createDeal(
      dealSchema.parse({
        name: "Lost deal",
        companyId: company.id,
        contactId: contact.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "1000",
      }),
      admin.id,
    );

    await expect(
      moveDeal(
        {
          dealId: deal.id,
          stageId: lostStage.id,
          expectedUpdatedAt: deal.updatedAt.toISOString(),
        },
        admin.id,
      ),
    ).rejects.toThrow("lost reason");

    const lost = await moveDeal(
      {
        dealId: deal.id,
        stageId: lostStage.id,
        lostReason: "Budget",
        expectedUpdatedAt: deal.updatedAt.toISOString(),
      },
      admin.id,
    );
    expect(lost.status).toBe("lost");
    expect(lost.lostReason).toBe("Budget");
  });

  it("rejects a stale deal move", async () => {
    const { admin, company, contact, pipeline, openStage, wonStage } = await fixture();
    const deal = await createDeal(
      dealSchema.parse({
        name: "Concurrent deal",
        companyId: company.id,
        contactId: contact.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "1000",
      }),
      admin.id,
    );
    const stale = deal.updatedAt.toISOString();
    await moveDeal({ dealId: deal.id, stageId: wonStage.id, expectedUpdatedAt: stale }, admin.id);
    await expect(
      moveDeal({ dealId: deal.id, stageId: openStage.id, expectedUpdatedAt: stale }, admin.id),
    ).rejects.toThrow("changed since you loaded");
  });

  it("records a stage-change activity with deal links", async () => {
    const { admin, company, contact, pipeline, openStage, wonStage } = await fixture();
    const listing = await createListing(contact.id, admin.id);
    const deal = await createDeal(
      dealSchema.parse({
        name: "Activity deal",
        companyId: company.id,
        contactId: contact.id,
        listingId: listing.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "1000",
      }),
      admin.id,
    );
    await moveDeal(
      { dealId: deal.id, stageId: wonStage.id, expectedUpdatedAt: deal.updatedAt.toISOString() },
      admin.id,
    );
    const { activities } = await import("@/db/schema");
    const { db } = await import("@/db");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(activities).where(eq(activities.dealId, deal.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("stage_change");
    expect(rows[0].metadata?.toStageName).toBe("Won");
    expect(rows[0].contactId).toBe(contact.id);
    expect(rows[0].listingId).toBe(listing.id);
  });

  it("guards occupied stages and pipelines", async () => {
    const { admin, contact, pipeline, openStage } = await fixture();
    await createDeal(
      dealSchema.parse({
        name: "Occupied",
        contactId: contact.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "1000",
      }),
      admin.id,
    );
    await expect(archivePipeline(pipeline.id)).rejects.toThrow("Move the pipeline's deals");
    await expect(deleteStage(openStage.id)).rejects.toThrow("Move this stage's deals");
  });

  it("reorders stages", async () => {
    const { pipeline } = await fixture();
    const loaded = await getPipeline(pipeline.id);
    const reversed = loaded!.stages.map((stage) => stage.id).reverse();
    const reordered = await reorderStages(pipeline.id, reversed);
    expect(reordered.map((stage) => stage.id)).toEqual(reversed);
  });

  it("calculates per-stage metrics by currency", async () => {
    const { admin, company, contact, pipeline, openStage, wonStage } = await fixture();
    const individual = await createContact(admin.id, null);
    await createDeal(
      dealSchema.parse({
        name: "Open USD",
        companyId: company.id,
        contactId: contact.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "10000",
      }),
      admin.id,
    );
    await createDeal(
      dealSchema.parse({
        name: "Open EUR",
        contactId: individual.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "5000",
        currency: "EUR",
      }),
      admin.id,
    );
    await createDeal(
      dealSchema.parse({
        name: "Won",
        companyId: company.id,
        contactId: contact.id,
        pipelineId: pipeline.id,
        stageId: wonStage.id,
        ownerId: admin.id,
        amount: "5000",
      }),
      admin.id,
    );

    const metrics = await getPipelineMetrics(pipeline.id);
    const open = metrics.find((stage) => stage.id === openStage.id)!;
    expect(open.dealCount).toBe(2);
    expect(open.totalValueByCurrency).toEqual([
      { currency: "EUR", total: 5000 },
      { currency: "USD", total: 10000 },
    ]);
    expect(open.weightedValueByCurrency).toEqual([
      { currency: "EUR", total: 1000 },
      { currency: "USD", total: 2000 },
    ]);
    expect(metrics.find((stage) => stage.id === wonStage.id)?.dealCount).toBe(0);
  });

  it("creates a deal with an archived company only when allowed", async () => {
    const admin = await createUser({ role: "admin" });
    const company = await createCompanyService(
      companySchema.parse({ name: "Archived Co", ownerId: admin.id }),
      admin.id,
    );
    const contact = await createContact(admin.id, company.id);
    const { setCompanyArchived } = await import("@/lib/services/companies");
    await setCompanyArchived(company.id, true);
    const { pipeline, openStage } = await createTestPipeline();
    await expect(
      createDeal(
        dealSchema.parse({
          name: "Archived deal",
          companyId: company.id,
          contactId: contact.id,
          pipelineId: pipeline.id,
          stageId: openStage.id,
          ownerId: admin.id,
          amount: "1000",
        }),
        admin.id,
      ),
    ).rejects.toThrow("active company");
  });

  it("keeps an archived company on an unchanged deal", async () => {
    const { admin, company, contact, pipeline, openStage } = await fixture();
    const deal = await createDeal(
      dealSchema.parse({
        name: "Archived later",
        companyId: company.id,
        contactId: contact.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "1000",
      }),
      admin.id,
    );
    const { setCompanyArchived } = await import("@/lib/services/companies");
    await setCompanyArchived(company.id, true);

    const updated = await updateDeal(
      deal.id,
      dealSchema.parse({
        name: "Still archived",
        companyId: company.id,
        contactId: contact.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "1200",
      }),
      admin.id,
      deal.updatedAt.toISOString(),
    );
    expect(updated.companyId).toBe(company.id);

    const other = await createCompany(admin.id, { name: "Other archived" });
    await setCompanyArchived(other.id, true);
    await expect(
      updateDeal(
        deal.id,
        dealSchema.parse({
          name: "Switch company",
          companyId: other.id,
          contactId: contact.id,
          pipelineId: pipeline.id,
          stageId: openStage.id,
          ownerId: admin.id,
          amount: "1200",
        }),
        admin.id,
        updated.updatedAt.toISOString(),
      ),
    ).rejects.toThrow("active company");
  });

  it("updates deal fields and records a stage change", async () => {
    const { admin, company, contact, pipeline, openStage, wonStage } = await fixture();
    const deal = await createDeal(
      dealSchema.parse({
        name: "Update me",
        companyId: company.id,
        contactId: contact.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "1000",
      }),
      admin.id,
    );
    const updated = await updateDeal(
      deal.id,
      dealSchema.parse({
        name: "Updated",
        companyId: company.id,
        contactId: contact.id,
        pipelineId: pipeline.id,
        stageId: wonStage.id,
        ownerId: admin.id,
        amount: "2500",
        lostReason: null,
      }),
      admin.id,
      deal.updatedAt.toISOString(),
    );
    expect(updated.name).toBe("Updated");
    expect(updated.status).toBe("won");
    expect((await getDeal(deal.id))?.amount).toBe("2500.00");
  });
});
