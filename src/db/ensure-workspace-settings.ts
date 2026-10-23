import { eq } from "drizzle-orm";
import { db, type Database } from "@/db";
import { workspaceSettings } from "@/db/schema";

export const DEFAULT_WORKSPACE_SETTINGS_ID = "default";

export async function ensureWorkspaceSettings(database: Database = db) {
  const [inserted] = await database
    .insert(workspaceSettings)
    .values({
      id: DEFAULT_WORKSPACE_SETTINGS_ID,
      defaultCurrency: "USD",
      timeZone: "UTC",
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) return inserted;

  const [existing] = await database
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.id, DEFAULT_WORKSPACE_SETTINGS_ID))
    .limit(1);

  return existing;
}
