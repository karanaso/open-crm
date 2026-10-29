import { expect, test } from "@playwright/test";
import { createCompany, createContact, login } from "./helpers";

const COMPANY = "E2E Marketing Co";
const CONTACT = { firstName: "Mia", lastName: "Market", email: "mia.market@example.com" };
const SEGMENT = "E2E VIP segment";
const CAMPAIGN = "E2E VIP outreach";

test.describe.configure({ mode: "serial" });

test.describe("marketing campaigns", () => {
  test("creates a live segment and activates a campaign snapshot", async ({ page }) => {
    await login(page);
    await createCompany(page, COMPANY, "e2e-marketing.example");
    await createContact(page, CONTACT.firstName, CONTACT.lastName, CONTACT.email, COMPANY);

    await page.goto("/segments/new");
    await page.fill("#name", SEGMENT);
    await page.fill("#tags", "vip");
    await page.fill("#industry", "Software");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/segments\/[0-9a-f-]+$/, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: SEGMENT })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mia Market" })).toBeVisible();

    await page.goto("/campaigns/new");
    await page.fill("#name", CAMPAIGN);
    const segmentValue = await page
      .locator("#segmentId option", { hasText: SEGMENT })
      .getAttribute("value");
    await page.selectOption("#segmentId", segmentValue!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/campaigns\/[0-9a-f-]+$/, { timeout: 30000 });
    await page.getByRole("button", { name: "Activate" }).click();
    await expect(page.getByText("Audience and engagement")).toBeVisible();
    await expect(page.getByRole("link", { name: "Mia Market" })).toBeVisible();
  });

  test("opens segment and campaign edit pages from list rows", async ({ page }) => {
    await login(page);

    await page.goto("/segments");
    const segmentEdit = page.getByRole("link", { name: `Edit ${SEGMENT}` });
    await expect(segmentEdit).toHaveAttribute("href", /\/segments\/[0-9a-f-]+\/edit$/);
    await segmentEdit.click();
    await expect(page).toHaveURL(/\/segments\/[0-9a-f-]+\/edit$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: `Edit ${SEGMENT}` })).toBeVisible();

    await page.goto("/campaigns");
    const campaignEdit = page.getByRole("link", { name: `Edit ${CAMPAIGN}` });
    await expect(campaignEdit).toHaveAttribute("href", /\/campaigns\/[0-9a-f-]+\/edit$/);
    await campaignEdit.click();
    await expect(page).toHaveURL(/\/campaigns\/[0-9a-f-]+\/edit$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: `Edit ${CAMPAIGN}` })).toBeVisible();
  });

  test("updates recipient engagement and archives the campaign", async ({ page }) => {
    await login(page);
    await page.goto("/campaigns");
    await page.getByRole("link", { name: CAMPAIGN, exact: true }).click();
    await expect(page.getByRole("heading", { name: CAMPAIGN })).toBeVisible();

    const row = page.locator("tr", { hasText: "Mia Market" });
    await row.locator('select[name="status"]').selectOption("responded");
    await row.getByRole("button", { name: "Save" }).click();
    await expect(row.locator('select[name="status"]')).toHaveValue("responded");

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Archive" }).click();
    await expect(page.getByText("Read-only")).toBeVisible();
  });
});
