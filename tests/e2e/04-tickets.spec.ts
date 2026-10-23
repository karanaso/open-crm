import { expect, test } from "@playwright/test";
import { createCompany, createContact, login } from "./helpers";

const COMPANY = "E2E Support Co";
const CONTACT = { firstName: "Sam", lastName: "Support", email: "sam.support@example.com" };
const SUBJECT = "E2E login troubleshooting";

test.describe.configure({ mode: "serial" });

test.describe("support desk", () => {
  test("creates a ticket and records a reply", async ({ page }) => {
    await login(page);
    await createCompany(page, COMPANY, "e2e-support.example");
    await createContact(page, CONTACT.firstName, CONTACT.lastName, CONTACT.email, COMPANY);

    await page.goto("/tickets/new");
    await page.fill("#subject", SUBJECT);
    await page.fill("#description", "The customer cannot complete SSO sign-in.");
    await page.fill('input[aria-label="Search requesters"]', CONTACT.email);
    const requesterValue = await page.locator("#requesterContactId option").nth(1).getAttribute("value");
    await page.selectOption("#requesterContactId", requesterValue!);
    await page.selectOption("#priority", "high");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/tickets\/[0-9a-f-]+$/, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: SUBJECT })).toBeVisible();
    await expect(page.getByText("First response")).toBeVisible();

    await page.fill("#comment-body", "We are investigating the SSO callback now.");
    await page.getByRole("button", { name: "Add comment" }).click();
    await expect(page.getByText("We are investigating the SSO callback now.")).toBeVisible();
  });

  test("resolves and reopens a ticket", async ({ page }) => {
    await login(page);
    await page.goto("/tickets");
    await page.fill('input[name="q"]', SUBJECT);
    await page.click('button[type="submit"]');
    await page.getByRole("link", { name: SUBJECT }).click();
    await expect(page.getByRole("heading", { name: SUBJECT })).toBeVisible();

    await page.getByRole("button", { name: "resolved", exact: true }).click();
    await expect(page.getByText("Resolved", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "open", exact: true }).click();
    await expect(page.getByText("Open", { exact: true }).first()).toBeVisible();
  });

  test("filters overdue tickets", async ({ page }) => {
    await login(page);
    await page.goto("/tickets?overdue=1");
    await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
    await expect(page.getByText("Overdue", { exact: true }).first()).toBeVisible();
  });

  test("shows related tickets on the contact and company", async ({ page }) => {
    await login(page);
    await page.goto("/contacts");
    await page.fill('input[name="q"]', CONTACT.email);
    await page.click('button[type="submit"]');
    await page.getByRole("link", { name: "Sam Support" }).click();
    await expect(page.getByRole("link", { name: SUBJECT })).toBeVisible();

    await page.getByRole("link", { name: COMPANY }).click();
    await expect(page.getByRole("heading", { name: COMPANY })).toBeVisible();
    await expect(page.getByRole("link", { name: SUBJECT })).toBeVisible();
  });
});
