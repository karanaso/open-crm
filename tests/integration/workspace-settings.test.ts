import { beforeEach, describe, expect, it } from "vitest";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { workspaceSettings } from "@/db/schema";
import { ensureWorkspaceSettings } from "@/db/ensure-workspace-settings";
import { resetDatabase } from "./helpers";
import {
  getWorkspaceDefaults,
  getWorkspaceSettings,
  updateWorkspaceSettings,
} from "@/lib/services/workspace-settings";
import { workspaceSettingsSchema } from "@/lib/validation/workspace-settings";

async function waitForClockTick() {
  await new Promise((resolve) => setTimeout(resolve, 5));
}

describe("workspace settings", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns the singleton defaults", async () => {
    const settings = await getWorkspaceSettings();
    expect(settings).toMatchObject({
      id: "default",
      defaultCurrency: "USD",
      timeZone: "UTC",
    });

    const [row] = await db.select({ count: count() }).from(workspaceSettings);
    expect(Number(row.count)).toBe(1);
  });

  it("ensures the singleton idempotently", async () => {
    const first = await ensureWorkspaceSettings();
    const second = await ensureWorkspaceSettings();
    expect(second?.id).toBe(first?.id);
    expect(second?.defaultCurrency).toBe("USD");

    const [row] = await db.select({ count: count() }).from(workspaceSettings);
    expect(Number(row.count)).toBe(1);
  });

  it("updates the currency and time zone and bumps updatedAt", async () => {
    const before = await getWorkspaceSettings();
    await waitForClockTick();

    const updated = await updateWorkspaceSettings(
      workspaceSettingsSchema.parse({
        defaultCurrency: "eur",
        timeZone: "Europe/Athens",
      }),
    );

    expect(updated).toMatchObject({
      id: "default",
      defaultCurrency: "EUR",
      timeZone: "Europe/Athens",
    });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());

    const reloaded = await getWorkspaceSettings();
    expect(reloaded.defaultCurrency).toBe("EUR");
    expect(reloaded.timeZone).toBe("Europe/Athens");

    const [row] = await db.select({ count: count() }).from(workspaceSettings);
    expect(Number(row.count)).toBe(1);
  });

  it("exposes defaults for new records", async () => {
    expect(await getWorkspaceDefaults()).toEqual({
      defaultCurrency: "USD",
      timeZone: "UTC",
    });

    await updateWorkspaceSettings(
      workspaceSettingsSchema.parse({ defaultCurrency: "GBP", timeZone: "Europe/London" }),
    );
    expect(await getWorkspaceDefaults()).toEqual({
      defaultCurrency: "GBP",
      timeZone: "Europe/London",
    });
  });

  it("does not save invalid identifiers", async () => {
    const invalidCurrency = workspaceSettingsSchema.safeParse({
      defaultCurrency: "EU",
      timeZone: "UTC",
    });
    expect(invalidCurrency.success).toBe(false);

    const invalidTimeZone = workspaceSettingsSchema.safeParse({
      defaultCurrency: "USD",
      timeZone: "Mars/Olympus",
    });
    expect(invalidTimeZone.success).toBe(false);

    const settings = await getWorkspaceSettings();
    expect(settings.defaultCurrency).toBe("USD");
    expect(settings.timeZone).toBe("UTC");
  });

  it("keeps a single row after several updates", async () => {
    for (const [currency, timeZone] of [
      ["EUR", "Europe/Athens"],
      ["USD", "UTC"],
      ["GBP", "Europe/London"],
    ]) {
      await updateWorkspaceSettings(
        workspaceSettingsSchema.parse({ defaultCurrency: currency, timeZone }),
      );
    }

    const rows = await db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.id, "default"));
    expect(rows).toHaveLength(1);
    expect(rows[0].defaultCurrency).toBe("GBP");
    expect(rows[0].timeZone).toBe("Europe/London");
  });
});
