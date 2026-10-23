import { randomUUID } from "node:crypto";
import { db } from "@/db";
import {
  companies,
  contacts,
  pipelines,
  stages,
  users,
  type NewUser,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";

export async function createUser(overrides: Partial<NewUser> = {}) {
  const email = (overrides.email ?? `user-${randomUUID()}@example.com`).toLowerCase();
  const [user] = await db
    .insert(users)
    .values({
      name: "Test User",
      passwordHash: await hashPassword("TestPassword123!"),
      role: "member",
      status: "active",
      ...overrides,
      email,
    })
    .returning();
  return user;
}

export async function createCompany(ownerId: string, overrides: Record<string, unknown> = {}) {
  const [company] = await db
    .insert(companies)
    .values({
      name: `Company ${randomUUID().slice(0, 8)}`,
      ownerId,
      ...overrides,
    })
    .returning();
  return company;
}

export async function createContact(
  ownerId: string,
  companyId: string | null,
  overrides: Record<string, unknown> = {},
) {
  const [contact] = await db
    .insert(contacts)
    .values({
      firstName: "Test",
      lastName: `Contact${randomUUID().slice(0, 6)}`,
      email: `contact-${randomUUID()}@example.com`,
      companyId,
      ownerId,
      ...overrides,
    })
    .returning();
  return contact;
}

export async function createTestPipeline() {
  const [pipeline] = await db
    .insert(pipelines)
    .values({ name: `Pipeline ${randomUUID().slice(0, 6)}`, isDefault: false })
    .returning();

  const stageRows = await db
    .insert(stages)
    .values([
      { pipelineId: pipeline.id, name: "Open", position: 0, probability: 20, outcome: "open" },
      { pipelineId: pipeline.id, name: "Won", position: 1, probability: 100, outcome: "won" },
      { pipelineId: pipeline.id, name: "Lost", position: 2, probability: 0, outcome: "lost" },
    ])
    .returning();

  return { pipeline, openStage: stageRows[0], wonStage: stageRows[1], lostStage: stageRows[2] };
}
