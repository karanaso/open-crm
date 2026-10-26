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

  test("theme control fits between search and the user menu", async ({ page }) => {
    await login(page);

    for (const width of [360, 768]) {
      await page.setViewportSize({ width, height: 900 });

      const header = page.locator("header");
      const search = header.getByRole("button", { name: /Search/ });
      const theme = header.getByRole("button", { name: "Change theme" });
      const user = header.getByRole("button").last();

      await expect(theme).toBeVisible();
      const [searchBox, themeBox, userBox] = await Promise.all([
        search.boundingBox(),
        theme.boundingBox(),
        user.boundingBox(),
      ]);

      expect(searchBox).not.toBeNull();
      expect(themeBox).not.toBeNull();
      expect(userBox).not.toBeNull();
      expect(searchBox!.x + searchBox!.width).toBeLessThanOrEqual(themeBox!.x + 1);
      expect(themeBox!.x + themeBox!.width).toBeLessThanOrEqual(userBox!.x + 1);

      await theme.click();
      await expect(page.getByRole("menuitemradio", { name: "System" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("menu")).toHaveCount(0);
    }
  });
});
