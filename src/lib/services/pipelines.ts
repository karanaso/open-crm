import { and, asc, count, desc, eq, isNull, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { deals, pipelines, stages, type Stage } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { dealMetrics } from "@/lib/metrics";
import { DEFAULT_STAGES } from "@/db/ensure-default-pipeline";

const FALLBACK_STAGES = DEFAULT_STAGES.map(({ name, position, probability, outcome }) => ({
  name,
  position,
  probability,
  outcome,
}));

export async function listPipelines(includeArchived = false) {
  const rows = await db
    .select()
    .from(pipelines)
    .where(includeArchived ? undefined : isNull(pipelines.archivedAt))
    .orderBy(desc(pipelines.isDefault), asc(pipelines.name));

  const stageRows = await db
    .select()
    .from(stages)
    .orderBy(asc(stages.position), asc(stages.name));

  return rows.map((pipeline) => ({
    ...pipeline,
    stages: stageRows.filter((stage) => stage.pipelineId === pipeline.id),
  }));
}

export async function getDefaultPipeline() {
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(and(eq(pipelines.isDefault, true), isNull(pipelines.archivedAt)))
    .limit(1);
  if (!pipeline) return null;
  const stageRows = await db
    .select()
    .from(stages)
    .where(eq(stages.pipelineId, pipeline.id))
    .orderBy(asc(stages.position));
  return { ...pipeline, stages: stageRows };
}

export async function getPipeline(pipelineId: string) {
  const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, pipelineId)).limit(1);
  if (!pipeline) return null;
  const stageRows = await db
    .select()
    .from(stages)
    .where(eq(stages.pipelineId, pipelineId))
    .orderBy(asc(stages.position));
  return { ...pipeline, stages: stageRows };
}

export async function getPipelineOptions() {
  return listPipelines(false);
}

export async function createPipeline(name: string) {
  return db.transaction(async (tx) => {
    const [pipeline] = await tx.insert(pipelines).values({ name, isDefault: false }).returning();
    await tx.insert(stages).values(
      FALLBACK_STAGES.map((stage) => ({
        ...stage,
        pipelineId: pipeline.id,
      })),
    );
    return pipeline;
  });
}

export async function renamePipeline(pipelineId: string, name: string) {
  const [pipeline] = await db
    .update(pipelines)
    .set({ name, updatedAt: new Date() })
    .where(eq(pipelines.id, pipelineId))
    .returning();
  if (!pipeline) throw new AppError("Pipeline not found", "NOT_FOUND");
  return pipeline;
}

export async function setDefaultPipeline(pipelineId: string) {
  return db.transaction(async (tx) => {
    const [pipeline] = await tx.select().from(pipelines).where(eq(pipelines.id, pipelineId)).limit(1);
    if (!pipeline) throw new AppError("Pipeline not found", "NOT_FOUND");
    if (pipeline.archivedAt) throw new AppError("An archived pipeline cannot be the default.", "ARCHIVED_PIPELINE");

    await tx.update(pipelines).set({ isDefault: false, updatedAt: new Date() });
    const [updated] = await tx
      .update(pipelines)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(pipelines.id, pipelineId))
      .returning();
    return updated;
  });
}

export async function archivePipeline(pipelineId: string) {
  return db.transaction(async (tx) => {
    const [pipeline] = await tx.select().from(pipelines).where(eq(pipelines.id, pipelineId)).limit(1);
    if (!pipeline) throw new AppError("Pipeline not found", "NOT_FOUND");
    if (pipeline.isDefault) throw new AppError("The default pipeline cannot be archived.", "DEFAULT_PIPELINE");

    const [dealCount] = await tx
      .select({ count: count() })
      .from(deals)
      .where(eq(deals.pipelineId, pipelineId));
    if (Number(dealCount?.count ?? 0) > 0) {
      throw new AppError("Move the pipeline's deals before archiving it.", "OCCUPIED_PIPELINE");
    }

    const [updated] = await tx
      .update(pipelines)
      .set({ archivedAt: new Date(), isDefault: false, updatedAt: new Date() })
      .where(eq(pipelines.id, pipelineId))
      .returning();
    return updated;
  });
}

export async function createStage(
  pipelineId: string,
  input: { name: string; probability: number; outcome: Stage["outcome"]; position?: number },
) {
  const pipeline = await getPipeline(pipelineId);
  if (!pipeline) throw new AppError("Pipeline not found", "NOT_FOUND");

  const [row] = await db
    .select({ maxPosition: max(stages.position) })
    .from(stages)
    .where(eq(stages.pipelineId, pipelineId));

  const [stage] = await db
    .insert(stages)
    .values({
      pipelineId,
      name: input.name,
      probability: input.probability,
      outcome: input.outcome,
      position: input.position ?? Number(row?.maxPosition ?? -1) + 1,
    })
    .returning();

  return stage;
}

export async function updateStage(
  stageId: string,
  input: { name: string; probability: number; outcome: Stage["outcome"]; position: number },
) {
  return db.transaction(async (tx) => {
    const [stage] = await tx.select().from(stages).where(eq(stages.id, stageId)).limit(1);
    if (!stage) throw new AppError("Stage not found", "NOT_FOUND");

    if (stage.outcome !== input.outcome) {
      const [dealCount] = await tx
        .select({ count: count() })
        .from(deals)
        .where(eq(deals.stageId, stageId));
      if (Number(dealCount?.count ?? 0) > 0) {
        throw new AppError("Move this stage's deals before changing its outcome.", "OCCUPIED_STAGE");
      }
    }

    const [updated] = await tx
      .update(stages)
      .set({
        name: input.name,
        probability: input.probability,
        outcome: input.outcome,
        position: input.position,
        updatedAt: new Date(),
      })
      .where(eq(stages.id, stageId))
      .returning();
    return updated;
  });
}

export async function deleteStage(stageId: string) {
  return db.transaction(async (tx) => {
    const [stage] = await tx.select().from(stages).where(eq(stages.id, stageId)).limit(1);
    if (!stage) throw new AppError("Stage not found", "NOT_FOUND");

    const [dealCount] = await tx
      .select({ count: count() })
      .from(deals)
      .where(eq(deals.stageId, stageId));
    if (Number(dealCount?.count ?? 0) > 0) {
      throw new AppError("Move this stage's deals before removing it.", "OCCUPIED_STAGE");
    }

    const [outcomeCount] = await tx
      .select({ count: count() })
      .from(stages)
      .where(and(eq(stages.pipelineId, stage.pipelineId), eq(stages.outcome, stage.outcome)));
    if (Number(outcomeCount?.count ?? 0) <= 1) {
      throw new AppError("A pipeline must keep at least one stage for each outcome.", "LAST_OUTCOME_STAGE");
    }

    await tx.delete(stages).where(eq(stages.id, stageId));
  });
}

export async function reorderStages(pipelineId: string, orderedStageIds: string[]) {
  return db.transaction(async (tx) => {
    for (const [index, stageId] of orderedStageIds.entries()) {
      await tx
        .update(stages)
        .set({ position: index, updatedAt: new Date() })
        .where(and(eq(stages.id, stageId), eq(stages.pipelineId, pipelineId)));
    }
    return tx
      .select()
      .from(stages)
      .where(eq(stages.pipelineId, pipelineId))
      .orderBy(asc(stages.position));
  });
}

export async function getPipelineDeals(pipelineId: string) {
  return db
    .select({ deal: deals, stage: stages })
    .from(deals)
    .innerJoin(stages, eq(deals.stageId, stages.id))
    .where(eq(deals.pipelineId, pipelineId))
    .orderBy(desc(deals.updatedAt));
}

export { dealMetrics };

export const pipelineServiceInternals = { sql };
