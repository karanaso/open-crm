import { expect, test } from "@playwright/test";
import { createCompany, createContact, login } from "./helpers";

const COMPANY = "E2E Directory Co";
const CONTACT = { firstName: "Dana", lastName: "Directory", email: "dana.directory@example.com" };

test.describe.configure({ mode: "serial" });

test.describe("customer directory", () => {
  test("creates a company and a linked contact", async ({ page }) => {
    await login(page);
    await createCompany(page, COMPANY, "e2e-directory.example");
    await createContact(page, CONTACT.firstName, CONTACT.lastName, CONTACT.email, COMPANY);

    await page.goto("/contacts");
    await page.fill('input[name="q"]', CONTACT.email);
    await page.click('button[type="submit"]');
    await expect(page.getByRole("link", { name: "Dana Directory", exact: true })).toBeVisible();
  });

  test("opens company and contact edit pages from list rows", async ({ page }) => {
    await login(page);
    const contactName = `${CONTACT.firstName} ${CONTACT.lastName}`;

    await page.goto("/companies");
    await page.fill('input[name="q"]', COMPANY);
    await page.click('button[type="submit"]');
    const companyEdit = page.getByRole("link", { name: `Edit ${COMPANY}` });
    await expect(companyEdit).toHaveAttribute("href", /\/companies\/[0-9a-f-]+\/edit$/);
    await companyEdit.click();
    await expect(page).toHaveURL(/\/companies\/[0-9a-f-]+\/edit$/);
    await expect(page.getByRole("heading", { name: `Edit ${COMPANY}` })).toBeVisible();

    await page.goto("/contacts");
    await page.fill('input[name="q"]', CONTACT.email);
    await page.click('button[type="submit"]');
    const contactEdit = page.getByRole("link", { name: `Edit ${contactName}` });
    await expect(contactEdit).toHaveAttribute("href", /\/contacts\/[0-9a-f-]+\/edit$/);
    await contactEdit.click();
    await expect(page).toHaveURL(/\/contacts\/[0-9a-f-]+\/edit$/);
    await expect(page.getByRole("heading", { name: `Edit ${contactName}` })).toBeVisible();
  });

  test("company search and detail relationships work", async ({ page }) => {
    await login(page);
    await page.goto("/companies");
    await page.fill('input[name="q"]', "E2E Directory");
    await page.click('button[type="submit"]');
    await page.getByRole("link", { name: COMPANY, exact: true }).click();
    await expect(page.getByRole("heading", { name: COMPANY })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dana Directory", exact: true })).toBeVisible();
  });

  test("reports invalid rows during CSV import", async ({ page }) => {
    await login(page);
    await page.goto("/import?target=companies");
    await page.setInputFiles("#import-file", {
      name: "e2e-partial.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "Company Name,Domain\nE2E Partial Co,e2e-partial.example\n,e2e-missing.example",
      ),
    });
    await page.getByRole("button", { name: "Import CSV" }).click();
    await expect(page.getByText("Import complete")).toBeVisible();
    await expect(page.getByText("1 imported")).toBeVisible();
    await expect(page.getByText("1 invalid rows")).toBeVisible();
    await expect(page.getByText(/Company name is required/)).toBeVisible();
  });

  test("imports companies from CSV", async ({ page }) => {
    await login(page);
    await page.goto("/import?target=companies");
    await page.setInputFiles("#import-file", {
      name: "e2e-companies.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "Company Name,Domain,Industry\nE2E Import Co,e2e-import.example,Software",
      ),
    });
    await expect(page.getByRole("heading", { name: "Map columns" })).toBeVisible();
    await page.getByRole("button", { name: "Import CSV" }).click();
    await expect(page.getByText("Import complete")).toBeVisible();
    await expect(page.getByText("1 imported")).toBeVisible();

    await page.goto("/companies");
    await page.fill('input[name="q"]', "E2E Import Co");
    await page.click('button[type="submit"]');
    await expect(page.getByRole("link", { name: "E2E Import Co", exact: true })).toBeVisible();
  });
});
