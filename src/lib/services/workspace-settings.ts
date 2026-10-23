import { eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceSettings, type WorkspaceSettings } from "@/db/schema";
import { DEFAULT_WORKSPACE_SETTINGS_ID, ensureWorkspaceSettings } from "@/db/ensure-workspace-settings";
import { AppError } from "@/lib/errors";
import type { WorkspaceSettingsInput } from "@/lib/validation/workspace-settings";

export type WorkspaceDefaults = {
  defaultCurrency: string;
  timeZone: string;
};

export async function getWorkspaceSettings(): Promise<WorkspaceSettings> {
  const settings = await ensureWorkspaceSettings();
  if (!settings) {
    throw new AppError("Workspace settings are unavailable.", "NOT_FOUND");
  }
  return settings;
}

export async function getWorkspaceDefaults(): Promise<WorkspaceDefaults> {
  const settings = await getWorkspaceSettings();
  return {
    defaultCurrency: settings.defaultCurrency,
    timeZone: settings.timeZone,
  };
}

export async function updateWorkspaceSettings(
  input: WorkspaceSettingsInput,
): Promise<WorkspaceSettings> {
  await ensureWorkspaceSettings();

  const [settings] = await db
    .update(workspaceSettings)
    .set({
      defaultCurrency: input.defaultCurrency,
      timeZone: input.timeZone,
      updatedAt: new Date(),
    })
    .where(eq(workspaceSettings.id, DEFAULT_WORKSPACE_SETTINGS_ID))
    .returning();

  if (!settings) {
    throw new AppError("Workspace settings are unavailable.", "NOT_FOUND");
  }
  return settings;
}
