import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("mobile shell", () => {
  test("mobile navigation opens and navigates", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("link", { name: "Companies" })).toBeVisible();
    await page.getByRole("link", { name: "Companies" }).click();
    await page.waitForURL("**/companies", { timeout: 30000 });
    await expect(page.getByRole("heading", { name: "Companies" })).toBeVisible({
      timeout: 15000,
    });
  });
});
