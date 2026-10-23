import { expect, test } from "@playwright/test";
import { createContact, createListing, login } from "./helpers";

test.describe.configure({ mode: "serial" });

const SEARCH_CONTACT = {
  firstName: "Lena",
  lastName: "Listing",
  email: "lena.listing@example.com",
};
const SEARCH_LISTING = {
  reference: "E2E-SEARCH-001",
  title: "E2E Search Villa",
  price: "100000",
  commission: "2000",
};

test.describe("dashboard and global search", () => {
  test("shows dashboard metrics and charts", async ({ page }) => {
    await login(page);
    await expect(page.getByText("Open commission", { exact: true })).toBeVisible();
    await expect(page.getByText("Open tickets", { exact: true })).toBeVisible();
    await expect(page.getByText("Active campaigns", { exact: true })).toBeVisible();
    await expect(page.getByText("Open deal value by stage").first()).toBeVisible();
    await expect(page.getByText("Recent activity")).toBeVisible();
  });

  test("global search finds a company and navigates to it", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: /Search companies/ }).click();
    await page
      .getByPlaceholder(/Search companies, contacts, listings, deals/)
      .fill("E2E Directory");
    await expect(page.getByText("E2E Directory Co")).toBeVisible({ timeout: 15000 });
    await page.getByText("E2E Directory Co").click();
    await expect(page.getByRole("heading", { name: "E2E Directory Co" })).toBeVisible();
  });

  test("global search finds a listing by reference", async ({ page }) => {
    await login(page);
    await createContact(
      page,
      SEARCH_CONTACT.firstName,
      SEARCH_CONTACT.lastName,
      SEARCH_CONTACT.email,
    );
    await createListing(page, {
      reference: SEARCH_LISTING.reference,
      title: SEARCH_LISTING.title,
      sellerName: `${SEARCH_CONTACT.firstName} ${SEARCH_CONTACT.lastName}`,
      transaction: "sale",
      price: SEARCH_LISTING.price,
      commission: SEARCH_LISTING.commission,
      currency: "EUR",
      propertyType: "villa",
      city: "Athens",
    });

    await page.getByRole("button", { name: /Search companies/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByPlaceholder(/Search companies, contacts, listings, deals/)
      .fill(SEARCH_LISTING.reference);

    await expect(dialog.getByText("Listings", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(dialog.getByText(SEARCH_LISTING.title, { exact: true })).toBeVisible();
    await dialog.getByText(SEARCH_LISTING.title, { exact: true }).click();

    await page.waitForURL(/\/listings\/[0-9a-f-]+$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: SEARCH_LISTING.title })).toBeVisible();
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

  test("admin updates the workspace default currency and time zone", async ({ page }) => {
    await login(page);
    await page.goto("/settings/workspace");
    await expect(page.getByRole("heading", { name: "Workspace defaults" })).toBeVisible();

    await page.selectOption("#defaultCurrency", "EUR");
    await page.selectOption("#timeZone", "Europe/Athens");
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === "POST" && response.url().includes("/settings/workspace"),
      ),
      page.getByRole("button", { name: "Save changes" }).click(),
    ]);

    await expect(page.locator("#defaultCurrency")).toHaveValue("EUR");
    await expect(page.locator("#timeZone")).toHaveValue("Europe/Athens");

    await page.reload();
    await expect(page.locator("#defaultCurrency")).toHaveValue("EUR");
    await expect(page.locator("#timeZone")).toHaveValue("Europe/Athens");

    // Restore the shared E2E defaults. UTC is a valid workspace zone and must
    // stay selectable after another zone is chosen; otherwise the default
    // cannot be restored from this form.
    await page.selectOption("#defaultCurrency", "USD");
    await expect(page.locator('#timeZone option[value="UTC"]')).toHaveCount(1);
    await page.selectOption("#timeZone", "UTC");
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === "POST" && response.url().includes("/settings/workspace"),
      ),
      page.getByRole("button", { name: "Save changes" }).click(),
    ]);

    await page.reload();
    await expect(page.locator("#defaultCurrency")).toHaveValue("USD");
    await expect(page.locator("#timeZone")).toHaveValue("UTC");
  });
});
