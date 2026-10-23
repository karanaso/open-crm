import { expect, type Page } from "@playwright/test";

export const ADMIN = {
  name: "Alex Morgan",
  email: "e2e-admin@example.com",
  password: "E2EPassword123!",
};

export const MEMBER = {
  name: "Priya Shah",
  email: "e2e-member@example.com",
  password: "MemberPassword123!",
  resetPassword: "MemberResetPassword123!",
};

export async function login(page: Page, email = ADMIN.email, password = ADMIN.password) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  await expect(page.getByRole("heading", { name: /Dashboard|Πίνακας ελέγχου/ })).toBeVisible();
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: /Alex Morgan|Priya Shah/ }).click();
  await page.getByRole("menuitem", { name: /Sign out|Αποσύνδεση/ }).click();
  await page.waitForURL("**/login", { timeout: 30000 });
}

export async function createCompany(page: Page, name: string, domain: string) {
  await page.goto("/companies/new");
  await page.fill("#name", name);
  await page.fill("#domain", domain);
  await page.fill("#industry", "Software");
  await page.fill("#tags", "vip, enterprise");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/companies\/[0-9a-f-]+$/, { timeout: 30000 });
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

export async function createContact(
  page: Page,
  firstName: string,
  lastName: string,
  email: string,
  companyName?: string,
) {
  await page.goto("/contacts/new");
  await page.fill("#firstName", firstName);
  await page.fill("#lastName", lastName);
  await page.fill("#email", email);
  if (companyName) {
    await page.selectOption("#companyId", { label: companyName });
  }
  await page.fill("#tags", "vip");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/contacts\/[0-9a-f-]+$/, { timeout: 30000 });
  await expect(page.getByRole("heading", { name: `${firstName} ${lastName}` })).toBeVisible();
}

export type ListingFormInput = {
  reference: string;
  title: string;
  sellerName: string;
  transaction?: "sale" | "rent";
  price: string;
  currency: string;
  commission?: string;
  propertyType?: string;
  city?: string;
  features?: string[];
};

/**
 * Create a listing through the English listing form and return its detail URL.
 * The helper also asserts the rent period field only appears for rent listings.
 */
export async function createListing(page: Page, input: ListingFormInput) {
  await page.goto("/listings/new");
  await page.fill("#reference", input.reference);
  await page.fill("#title", input.title);
  await page.selectOption("#transaction", input.transaction ?? "sale");
  await page.selectOption("#sellerContactId", { label: input.sellerName });
  await page.selectOption("#propertyType", input.propertyType ?? "apartment");
  await page.fill("#price", input.price);
  await page.fill("#currency", input.currency);
  if (input.commission !== undefined) {
    await page.fill("#commissionAmount", input.commission);
  }
  if (input.city) {
    await page.fill("#city", input.city);
  }
  for (const feature of input.features ?? []) {
    const checkbox = page.locator(feature);
    const group = page.locator("details").filter({ has: checkbox });
    if ((await group.getAttribute("open")) === null) {
      await group.locator("summary").click();
    }
    await checkbox.check();
  }
  if ((input.transaction ?? "sale") === "rent") {
    await expect(page.locator("#pricePeriod")).toBeVisible();
  } else {
    await expect(page.locator("#pricePeriod")).toHaveCount(0);
  }

  await page.getByRole("button", { name: "Create listing" }).click();
  await page.waitForURL(/\/listings\/[0-9a-f-]+$/, { timeout: 30000 });
  await expect(page.getByRole("heading", { name: input.title })).toBeVisible();
  return page.url();
}
