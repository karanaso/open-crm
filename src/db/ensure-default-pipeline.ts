import { eq, sql } from "drizzle-orm";
import { db, type Database } from "@/db";
import { pipelines, stages, users } from "@/db/schema";

export const DEFAULT_PIPELINE_ID = "00000000-0000-4000-8000-000000000001";

export const DEFAULT_STAGES = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    name: "Lead",
    position: 0,
    probability: 10,
    outcome: "open" as const,
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    name: "Qualified",
    position: 1,
    probability: 25,
    outcome: "open" as const,
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    name: "Proposal",
    position: 2,
    probability: 50,
    outcome: "open" as const,
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    name: "Negotiation",
    position: 3,
    probability: 75,
    outcome: "open" as const,
  },
  {
    id: "00000000-0000-4000-8000-000000000105",
    name: "Won",
    position: 4,
    probability: 100,
    outcome: "won" as const,
  },
  {
    id: "00000000-0000-4000-8000-000000000106",
    name: "Lost",
    position: 5,
    probability: 0,
    outcome: "lost" as const,
  },
];

export async function ensureDefaultPipeline(database: Database = db) {
  const existing = await database.select().from(pipelines).limit(1);

  if (existing.length > 0) {
    if (!existing.some((pipeline) => pipeline.isDefault)) {
      await database.update(pipelines).set({ isDefault: true }).where(eq(pipelines.id, existing[0].id));
    }
    return existing.find((pipeline) => pipeline.isDefault) ?? existing[0];
  }

  const [pipeline] = await database
    .insert(pipelines)
    .values({
      id: DEFAULT_PIPELINE_ID,
      name: "Sales Pipeline",
      isDefault: true,
    })
    .onConflictDoNothing()
    .returning();

  if (!pipeline) {
    const [fallback] = await database
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, DEFAULT_PIPELINE_ID))
      .limit(1);
    return fallback;
  }

  await database
    .insert(stages)
    .values(
      DEFAULT_STAGES.map((stage) => ({
        ...stage,
        pipelineId: pipeline.id,
      })),
    )
    .onConflictDoNothing();

  return pipeline;
}

export async function countUsers(database: Database = db) {
  const [row] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  return row?.count ?? 0;
}
