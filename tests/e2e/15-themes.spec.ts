import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

test.describe.configure({ mode: "serial" });

const BASE_URL = "http://localhost:3100";

async function openProfile(page: Page) {
  await page.goto("/settings/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
}

async function selectTheme(page: Page, label: string, id: string) {
  await page.getByText(label, { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", id);
}

async function selectMode(page: Page, label: string, id: string) {
  await page.getByText(label, { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-mode", id);
}

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

test.describe("theme journey", () => {
  test("switches palette and mode in profile and keeps them after reload", async ({ page }) => {
    await login(page);
    await openProfile(page);

    await selectTheme(page, "Violet", "violet");
    await selectMode(page, "Dark", "dark");

    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);
    const colorScheme = await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    );
    expect(colorScheme).toContain("dark");

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "violet");
    await expect(html).toHaveAttribute("data-mode", "dark");
    await expect(html).toHaveClass(/dark/);
  });

  test("changes from the header and the profile reflects the selection", async ({ page }) => {
    await login(page);

    await page.getByRole("button", { name: "Change theme" }).click();
    await page.getByRole("menuitemradio", { name: "Emerald" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "emerald");

    await page.getByRole("button", { name: "Change theme" }).click();
    await page.getByRole("menuitemradio", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");

    await page.goto("/settings/profile");
    await expect(page.getByRole("radio", { name: /Emerald/ })).toBeChecked();
    await expect(page.getByRole("radio", { name: "Light" })).toBeChecked();
  });

  test("restores the saved preference in a fresh browser context", async ({ page, browser }) => {
    await login(page);
    await openProfile(page);
    await selectTheme(page, "Rose", "rose");
    await selectMode(page, "Light", "light");

    const context = await browser.newContext({ baseURL: BASE_URL });
    const freshPage = await context.newPage();
    await login(freshPage);

    await expect(freshPage.locator("html")).toHaveAttribute("data-theme", "rose");
    await expect(freshPage.locator("html")).toHaveAttribute("data-mode", "light");
    await context.close();
  });

  test("follows the system preference and reacts live", async ({ page }) => {
    await login(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await openProfile(page);
    await selectMode(page, "System", "system");

    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);

    await page.emulateMedia({ colorScheme: "light" });
    await expect(html).not.toHaveClass(/dark/);

    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload();
    await expect(html).toHaveAttribute("data-mode", "system");
    await expect(html).toHaveClass(/dark/);
  });

  test("has no serious accessibility violations in light and dark", async ({ page }) => {
    await login(page);
    await openProfile(page);
    await selectTheme(page, "Default", "default");
    await selectMode(page, "Light", "light");

    await page.goto("/dashboard");
    await expectNoSeriousViolations(page);

    await openProfile(page);
    await selectTheme(page, "Violet", "violet");
    await selectMode(page, "Dark", "dark");
    await expectNoSeriousViolations(page);

    await page.goto("/dashboard");
    await expectNoSeriousViolations(page);
  });
});
