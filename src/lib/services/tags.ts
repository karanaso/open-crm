import { inArray } from "drizzle-orm";
import { tags } from "@/db/schema";
import type { Executor } from "@/db/types";

export async function ensureTags(executor: Executor, names: string[]) {
  if (names.length === 0) return [];
  const existing = await executor.select().from(tags).where(inArray(tags.name, names));
  const missing = names.filter((name) => !existing.some((tag) => tag.name === name));

  if (missing.length > 0) {
    await executor
      .insert(tags)
      .values(missing.map((name) => ({ name })))
      .onConflictDoNothing();
  }

  return executor.select().from(tags).where(inArray(tags.name, names));
}
