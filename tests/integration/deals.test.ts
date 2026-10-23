import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "./helpers";
import { createCompany, createContact, createTestPipeline, createUser } from "./factories";
import {
  archivePipeline,
  createPipeline,
  deleteStage,
  getDefaultPipeline,
  getPipeline,
  reorderStages,
  setDefaultPipeline,
} from "@/lib/services/pipelines";
import { createDeal, getDeal, getPipelineMetrics, moveDeal, updateDeal } from "@/lib/services/deals";
import { dealSchema } from "@/lib/validation/deal";
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
    const { admin, company, pipeline, wonStage } = await fixture();
    const other = await createTestPipeline();
    await expect(
      createDeal(
        dealSchema.parse({
          name: "Mismatch",
          companyId: company.id,
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
    const { admin, company, pipeline, openStage, lostStage } = await fixture();
    const deal = await createDeal(
      dealSchema.parse({
        name: "Lost deal",
        companyId: company.id,
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
    const { admin, company, pipeline, openStage, wonStage } = await fixture();
    const deal = await createDeal(
      dealSchema.parse({
        name: "Concurrent deal",
        companyId: company.id,
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

  it("records a stage-change activity", async () => {
    const { admin, company, pipeline, openStage, wonStage } = await fixture();
    const deal = await createDeal(
      dealSchema.parse({
        name: "Activity deal",
        companyId: company.id,
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
  });

  it("guards occupied stages and pipelines", async () => {
    const { admin, company, pipeline, openStage } = await fixture();
    await createDeal(
      dealSchema.parse({
        name: "Occupied",
        companyId: company.id,
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

  it("calculates per-stage metrics", async () => {
    const { admin, company, pipeline, openStage, wonStage } = await fixture();
    await createDeal(
      dealSchema.parse({
        name: "Open",
        companyId: company.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "10000",
      }),
      admin.id,
    );
    await createDeal(
      dealSchema.parse({
        name: "Won",
        companyId: company.id,
        pipelineId: pipeline.id,
        stageId: wonStage.id,
        ownerId: admin.id,
        amount: "5000",
      }),
      admin.id,
    );
    const metrics = await getPipelineMetrics(pipeline.id);
    expect(metrics.find((stage) => stage.id === openStage.id)?.dealCount).toBe(1);
    expect(metrics.find((stage) => stage.id === openStage.id)?.totalValue).toBe(10000);
    expect(metrics.find((stage) => stage.id === wonStage.id)?.dealCount).toBe(0);
  });

  it("creates a deal with an archived company only when allowed", async () => {
    const admin = await createUser({ role: "admin" });
    const company = await createCompanyService(
      companySchema.parse({ name: "Archived Co", ownerId: admin.id }),
      admin.id,
    );
    const { setCompanyArchived } = await import("@/lib/services/companies");
    await setCompanyArchived(company.id, true);
    const { pipeline, openStage } = await createTestPipeline();
    await expect(
      createDeal(
        dealSchema.parse({
          name: "Archived deal",
          companyId: company.id,
          pipelineId: pipeline.id,
          stageId: openStage.id,
          ownerId: admin.id,
          amount: "1000",
        }),
        admin.id,
      ),
    ).rejects.toThrow("active company");
  });

  it("updates deal fields and records a stage change", async () => {
    const { admin, company, pipeline, openStage, wonStage } = await fixture();
    const deal = await createDeal(
      dealSchema.parse({
        name: "Update me",
        companyId: company.id,
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
