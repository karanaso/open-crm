import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";
import en from "../../messages/en.json";
import el from "../../messages/el.json";

test.describe.configure({ mode: "serial" });

async function switchLocale(page: Page, locale: "en" | "el") {
  await page.goto("/settings/profile");

  const current = await page.locator("html").getAttribute("lang");
  if (current !== locale) {
    const triggerName = current === "el" ? "Γλώσσα" : "Language";
    const optionName =
      locale === "el"
        ? current === "el"
          ? "Ελληνικά"
          : "Greek"
        : current === "el"
          ? "Αγγλικά"
          : "English";

    await page.getByRole("combobox", { name: triggerName }).click();
    await page.getByRole("option", { name: optionName }).click();
  }

  await expect(page.locator("html")).toHaveAttribute("lang", locale);
}

test.describe("localized error pages", () => {
  test("Greek 404 is localized and accessible", async ({ page }) => {
    await login(page);
    await switchLocale(page, "el");

    await page.goto("/this-page-does-not-exist");
    await expect(page.locator("html")).toHaveAttribute("lang", "el");
    await expect(page.getByRole("heading", { name: el.errorPages.notFoundTitle })).toBeVisible();
    await expect(page.getByText(el.errorPages.notFoundDescription)).toBeVisible();
    await expect(page.getByRole("link", { name: el.errorPages.backToDashboard })).toHaveAttribute(
      "href",
      "/dashboard",
    );

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .exclude("nextjs-portal")
      .analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);

    await page.goto("/companies/00000000-0000-0000-0000-000000000000");
    await expect(page.getByRole("heading", { name: el.errorPages.notFoundTitle })).toBeVisible();

    await page.getByRole("link", { name: el.errorPages.backToDashboard }).first().click();
    await page.waitForURL("**/dashboard", { timeout: 30000 });
  });

  test("English 404 is localized", async ({ page }) => {
    await login(page);
    await switchLocale(page, "en");

    await page.goto("/this-page-does-not-exist");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { name: en.errorPages.notFoundTitle })).toBeVisible();
    await expect(page.getByText(en.errorPages.notFoundDescription)).toBeVisible();
    await expect(page.getByRole("link", { name: en.errorPages.backToDashboard })).toHaveAttribute(
      "href",
      "/dashboard",
    );

    await page.getByRole("link", { name: en.errorPages.backToDashboard }).click();
    await page.waitForURL("**/dashboard", { timeout: 30000 });
  });
});
