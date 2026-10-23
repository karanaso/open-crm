import { expect, test } from "@playwright/test";
import { createContact, createListing, login } from "./helpers";

test.describe.configure({ mode: "serial" });

const BUYER = { firstName: "Iris", lastName: "Individual", email: "iris.individual@example.com" };
const DEAL = "E2E Individual Buyer Deal";
const LISTING = {
  reference: "E2E-DEAL-LISTING",
  title: "E2E Deal Listing",
  price: "200000",
  commission: "5000",
};

let dealUrl = "";

test.describe("deals for individual buyers", () => {
  test("creates a deal for a contact without a company", async ({ page }) => {
    await login(page);
    await createContact(page, BUYER.firstName, BUYER.lastName, BUYER.email);

    await page.goto("/deals/new");
    await expect(page.getByRole("heading", { name: "New deal" })).toBeVisible();
    await expect(page.locator("#companyId")).toHaveValue("none");
    await page.fill("#name", DEAL);
    await page.selectOption("#contactId", { label: `${BUYER.firstName} ${BUYER.lastName}` });
    await page.selectOption("#currency", "EUR");
    await page.fill("#amount", "1500");
    await page.getByRole("button", { name: "Create deal" }).click();

    await page.waitForURL(/\/deals\/[0-9a-f-]+$/, { timeout: 30000 });
    dealUrl = page.url();

    await expect(page.getByRole("heading", { name: DEAL })).toBeVisible();
    await expect(
      page.getByRole("link", { name: `${BUYER.firstName} ${BUYER.lastName}` }),
    ).toBeVisible();
    await expect(page.getByText("Individual buyer", { exact: true })).toBeVisible();
    await expect(page.getByText("Standalone deal", { exact: true })).toBeVisible();
    await expect(page.getByText("€1,500.00", { exact: true }).first()).toBeVisible();
    await expect(page.locator('a[href^="/companies/"]')).toHaveCount(0);
    await expect(page.locator('a[href*="/companies/undefined"]')).toHaveCount(0);
  });

  test("shows the individual deal on the board and in the list", async ({ page }) => {
    await login(page);

    await page.goto("/deals");
    const card = page.locator("div.rounded-lg.border.bg-card", { hasText: DEAL }).first();
    await expect(card).toBeVisible();
    await expect(card.getByText(`${BUYER.firstName} ${BUYER.lastName}`)).toBeVisible();
    await expect(card.getByText("€1,500.00", { exact: true })).toBeVisible();

    await page.goto(`/deals?view=list&q=${encodeURIComponent(DEAL)}`);
    const row = page.locator("tr", { hasText: DEAL });
    await expect(row).toBeVisible();
    await expect(row.getByText(`${BUYER.firstName} ${BUYER.lastName}`)).toBeVisible();
    await expect(row.getByText("€1,500.00", { exact: true })).toBeVisible();
  });

  test("edits the deal, links it to a listing, and keeps the no-company state", async ({
    page,
  }) => {
    await login(page);
    await createListing(page, {
      reference: LISTING.reference,
      title: LISTING.title,
      sellerName: `${BUYER.firstName} ${BUYER.lastName}`,
      transaction: "sale",
      price: LISTING.price,
      commission: LISTING.commission,
      currency: "EUR",
      propertyType: "villa",
      city: "Athens",
    });

    await page.goto(`${dealUrl}/edit`);
    await expect(page.getByRole("heading", { name: `Edit ${DEAL}` })).toBeVisible();
    await expect(page.locator("#companyId")).toHaveValue("none");
    await expect(page.locator("#contactId option:checked")).toHaveText(
      `${BUYER.firstName} ${BUYER.lastName}`,
    );
    await expect(page.locator("#currency")).toHaveValue("EUR");

    const listingValue = await page
      .locator("#listingId option")
      .filter({ hasText: LISTING.reference })
      .getAttribute("value");
    expect(listingValue).toBeTruthy();
    await page.selectOption("#listingId", listingValue!);
    await expect(page.locator("#currency")).toHaveValue("EUR");
    expect(Number(await page.locator("#propertyPrice").inputValue())).toBe(200000);
    expect(Number(await page.locator("#amount").inputValue())).toBe(5000);

    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForURL(/\/deals\/[0-9a-f-]+$/, { timeout: 30000 });

    await expect(page.getByRole("link", { name: /E2E-DEAL-LISTING/ })).toBeVisible();
    await expect(page.getByText("€200,000.00", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("€5,000.00", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Individual buyer", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: `${BUYER.firstName} ${BUYER.lastName}` }),
    ).toBeVisible();
    await expect(page.getByText("Standalone deal", { exact: true })).toHaveCount(0);
    await expect(page.locator('a[href^="/companies/"]')).toHaveCount(0);

    // Reopening the edit form preserves the contact-only and listing state.
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.locator("#companyId")).toHaveValue("none");
    await expect(page.locator("#contactId option:checked")).toHaveText(
      `${BUYER.firstName} ${BUYER.lastName}`,
    );
    await expect(page.locator("#listingId option:checked")).toContainText(LISTING.reference);
    await page.fill("#description", "Updated individual buyer deal");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForURL(/\/deals\/[0-9a-f-]+$/, { timeout: 30000 });
    await expect(page.getByText("Updated individual buyer deal")).toBeVisible();
    await expect(page.getByText("Individual buyer", { exact: true })).toBeVisible();
    await expect(page.locator('a[href^="/companies/"]')).toHaveCount(0);
  });
});
