import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createContact, createListing, login } from "./helpers";

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .exclude("nextjs-portal")
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test.describe("accessibility", () => {
  test("dashboard has no serious accessibility violations", async ({ page }) => {
    await login(page);
    await expectNoSeriousViolations(page);
  });

  test("company form has no serious accessibility violations", async ({ page }) => {
    await login(page);
    await page.goto("/companies/new");
    await expect(page.getByRole("heading", { name: "New company" })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("listings list, form, detail, and overview are accessible", async ({ page }) => {
    await login(page);
    const stamp = Date.now();
    await createContact(page, "A11y", "Seller", `a11y-seller-${stamp}@example.com`);
    await createListing(page, {
      reference: `A11Y-${stamp}`,
      title: `A11y listing ${stamp}`,
      sellerName: "A11y Seller",
      price: "250000",
      currency: "EUR",
      commission: "5000",
      city: "Athens",
    });

    await expectNoSeriousViolations(page);

    await page.goto("/listings");
    await expect(page.getByRole("heading", { name: "Listings" })).toBeVisible();
    await expectNoSeriousViolations(page);

    await page.goto("/listings/new");
    await expect(page.getByRole("heading", { name: "New listing" })).toBeVisible();
    await expectNoSeriousViolations(page);

    await page.goto("/listings/dashboard");
    await expect(page.getByRole("heading", { name: /Overview|Listings overview/ })).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});

test("messaging pages have no serious accessibility violations", async ({ page }) => {
  await login(page);

  await page.goto("/messages");
  await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.goto("/messages/new");
  await expect(page.getByRole("heading", { name: "New message" })).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.goto("/messages/groups");
  await expect(page.getByRole("heading", { name: "Recipient groups" })).toBeVisible();
  await expectNoSeriousViolations(page);
});
