import { expect, test } from "@playwright/test";
import { createCompany, createContact, login } from "./helpers";

const COMPANY = "E2E Deals Co";
const CONTACT = { firstName: "Devon", lastName: "Deal", email: "devon.deal@example.com" };
const DEAL = "E2E Operations Platform";

test.describe.configure({ mode: "serial" });

test.describe("sales pipeline", () => {
  test("creates a deal and moves it to won", async ({ page }) => {
    await login(page);
    await createCompany(page, COMPANY, "e2e-deals.example");
    await createContact(page, CONTACT.firstName, CONTACT.lastName, CONTACT.email, COMPANY);

    await page.goto("/deals/new");
    await page.fill("#name", DEAL);
    await page.selectOption("#companyId", { label: COMPANY });
    await page.selectOption("#contactId", { label: `${CONTACT.firstName} ${CONTACT.lastName}` });
    await page.fill("#amount", "25000");
    await page.fill("#expectedCloseDate", "2026-12-15");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/deals\/[0-9a-f-]+$/, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: DEAL })).toBeVisible();

    await page.selectOption("#deal-stage", { label: "Won" });
    await page.getByRole("button", { name: "Update stage" }).click();
    await expect(page.getByText("Stage updated.")).toBeVisible();
    await expect(page.getByText(/Stage changed: .* → Won/)).toBeVisible();
  });

  test("moves a deal with the accessible stage menu", async ({ page }) => {
    await login(page);
    await page.goto("/deals");
    const card = page.locator("div.rounded-lg.border.bg-card", { hasText: DEAL }).first();
    await expect(card).toBeVisible();
    await page.getByRole("button", { name: `Move ${DEAL}` }).click();
    await page.getByRole("menuitem", { name: "Qualified" }).click();
    await expect(page.getByText("Moved to Qualified")).toBeVisible();
  });

  test("logs an activity on the deal timeline", async ({ page }) => {
    await login(page);
    await page.goto("/deals?view=list");
    await page.fill('input[name="q"]', DEAL);
    await page.click('button[type="submit"]');
    await page.getByRole("link", { name: DEAL }).click();
    await expect(page.getByRole("heading", { name: DEAL })).toBeVisible();

    await page.selectOption("#activity-type", "call");
    await page.fill("#activity-subject", "E2E kickoff call");
    await page.fill("#activity-body", "Logged from the E2E suite.");
    await page.getByRole("button", { name: "Log activity" }).click();
    await expect(page.getByText("E2E kickoff call")).toBeVisible();
  });

  test("creates and completes a follow-up task", async ({ page }) => {
    await login(page);
    await page.goto("/deals?view=list");
    await page.fill('input[name="q"]', DEAL);
    await page.click('button[type="submit"]');
    await page.getByRole("link", { name: DEAL }).click();
    await expect(page.getByRole("heading", { name: DEAL })).toBeVisible();

    await page.getByText("Add a task").click();
    await page.fill("#task-title", "E2E follow-up");
    await page.getByRole("button", { name: "Create task" }).click();
    await expect(page.getByText("E2E follow-up")).toBeVisible();

    await page.goto("/tasks");
    const taskRow = page.locator("li", { hasText: "E2E follow-up" });
    await expect(taskRow).toBeVisible();
    await taskRow.getByRole("button", { name: "Complete" }).click();
    await expect(
      page.locator("li", { hasText: "E2E follow-up" }).locator("p.line-through"),
    ).toBeVisible();
  });

  test("opens the deal list with filters", async ({ page }) => {
    await login(page);
    await page.goto("/deals?view=list");
    await expect(page.getByRole("heading", { name: "Deals" })).toBeVisible();
    await page.fill('input[name="q"]', DEAL);
    await page.selectOption('select[name="status"]', "open");
    await page.click('button[type="submit"]');
    await expect(page.getByRole("link", { name: DEAL })).toBeVisible();
  });

  test("labels commission and requires a buyer contact", async ({ page }) => {
    await login(page);
    await page.goto("/deals/new");

    await expect(page.locator('label[for="amount"]')).toContainText("Commission");
    const contact = page.locator("#contactId");
    await expect(contact).toHaveAttribute("required", "");

    await page.fill("#name", "E2E Missing Contact Deal");
    await page.getByRole("button", { name: "Create deal" }).click();

    await expect(page).toHaveURL(/\/deals\/new/);
    expect(await contact.evaluate((element: HTMLSelectElement) => element.validity.valid)).toBe(
      false,
    );
  });
});
