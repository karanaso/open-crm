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
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: /Alex Morgan|Priya Shah/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
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
