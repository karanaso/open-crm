import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("dashboard and global search", () => {
  test("shows dashboard metrics and charts", async ({ page }) => {
    await login(page);
    await expect(page.getByText("Open pipeline", { exact: true })).toBeVisible();
    await expect(page.getByText("Open tickets", { exact: true })).toBeVisible();
    await expect(page.getByText("Active campaigns", { exact: true })).toBeVisible();
    await expect(page.getByText("Open deal value by stage")).toBeVisible();
    await expect(page.getByText("Recent activity")).toBeVisible();
  });

  test("global search finds a company and navigates to it", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: /Search companies/ }).click();
    await page.getByPlaceholder("Search companies, contacts, deals, tickets, campaigns…").fill("E2E Directory");
    await expect(page.getByText("E2E Directory Co")).toBeVisible({ timeout: 15000 });
    await page.getByText("E2E Directory Co").click();
    await expect(page.getByRole("heading", { name: "E2E Directory Co" })).toBeVisible();
  });

  test("global search rejects anonymous requests", async ({ request }) => {
    const response = await request.get("/api/search?q=acme");
    expect(response.status()).toBe(401);
  });

  test("task and settings pages remain available", async ({ page }) => {
    await login(page);
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
    await page.goto("/settings/pipelines");
    await expect(page.getByRole("heading", { name: "Pipelines" })).toBeVisible();
    await expect(page.getByText("Sales Pipeline")).toBeVisible();
  });

  test("creates a pipeline and makes it the default", async ({ page }) => {
    await login(page);
    await page.goto("/settings/pipelines");
    await page.fill("#new-pipeline-name", "E2E Pipeline");
    await page.getByRole("button", { name: "Create pipeline" }).click();
    await expect(page.getByText("E2E Pipeline", { exact: true })).toBeVisible();

    const card = page.locator("div.rounded-xl.border", { hasText: "E2E Pipeline" }).first();
    await card.getByRole("button", { name: "Make default" }).click();
    await expect(card.getByText("Default", { exact: true })).toBeVisible();
  });
});
