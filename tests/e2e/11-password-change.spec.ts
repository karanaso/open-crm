import { expect, test, type Browser, type Page } from "@playwright/test";
import { ADMIN, login } from "./helpers";

test.describe.configure({ mode: "serial" });

const NEW_PASSWORD = "E2EChangedPassword123!";
const PASSWORD_CHANGED_NOTICE = "Password updated. Sign in with your new password.";

/**
 * Spec 11 normally runs after 01-auth.spec.ts, which creates the workspace admin.
 * When this file runs alone, prepare.ts has just reset the database, so create the
 * admin through the first-run setup form before exercising the password flow.
 */
async function ensureWorkspaceAdmin(browser: Browser, baseURL: string | undefined) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  try {
    // Requesting /setup directly avoids racing the client-side redirect from /login.
    await page.goto("/setup");
    await expect(page.locator("#email")).toBeVisible({ timeout: 30_000 });
    if (new URL(page.url()).pathname !== "/setup") return;

    await page.fill("#name", ADMIN.name);
    await page.fill("#email", ADMIN.email);
    await page.fill("#password", ADMIN.password);
    await page.getByRole("button", { name: "Create workspace" }).click();
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
  } finally {
    await context.close();
  }
}

async function changePassword(page: Page, currentPassword: string, newPassword: string) {
  await page.goto("/settings/profile");
  await page.fill("#currentPassword", currentPassword);
  await page.fill("#newPassword", newPassword);
  await page.fill("#confirmPassword", newPassword);
  await page.getByRole("button", { name: "Update password" }).click();
}

test.describe("password change session lifecycle", () => {
  test("password change signs out the current user and invalidates other sessions", async ({
    browser,
    baseURL,
  }) => {
    // The dev server compiles the profile action on first use and the pre-fix run
    // deliberately waits out failed URL assertions before observing the redirect loop.
    test.setTimeout(120_000);

    await ensureWorkspaceAdmin(browser, baseURL);

    const contextA = await browser.newContext({ baseURL });
    const contextB = await browser.newContext({ baseURL });

    try {
      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();

      await login(pageA, ADMIN.email, ADMIN.password);
      await login(pageB, ADMIN.email, ADMIN.password);

      await changePassword(pageA, ADMIN.password, NEW_PASSWORD);

      // Soft assertions let the pre-fix run continue to context B and record the
      // /login <-> /dashboard loop in addition to the missing sign-in redirect.
      await expect
        .soft(pageA)
        .toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("changed") === "1", {
          timeout: 15_000,
        });
      await expect.soft(pageA.getByText(PASSWORD_CHANGED_NOTICE, { exact: true })).toBeVisible();
      await expect.soft(pageA.locator("#email")).toBeVisible();

      // Context B still holds the JWT from before the password change. Requesting a
      // protected page must send it to sign-in and leave the sign-in form visible.
      await pageB.goto("/dashboard");
      await expect(pageB).toHaveURL(/\/login(?:\?.*)?$/);
      await expect(pageB.getByRole("heading", { name: "Welcome back" })).toBeVisible();
      await expect(pageB.locator("#email")).toBeVisible();

      // A stale session must not bounce back to the dashboard a moment later.
      await pageB.waitForTimeout(1_000);
      await expect(pageB).toHaveURL(/\/login(?:\?.*)?$/);
      await expect(pageB.locator("#email")).toBeVisible();

      // The password used before the change is rejected.
      await pageB.fill("#email", ADMIN.email);
      await pageB.fill("#password", ADMIN.password);
      await pageB.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(pageB.getByText(/Unable to sign in/)).toBeVisible();

      // The new password signs in.
      await pageB.fill("#email", ADMIN.email);
      await pageB.fill("#password", NEW_PASSWORD);
      await pageB.getByRole("button", { name: "Sign in", exact: true }).click();
      await pageB.waitForURL("**/dashboard", { timeout: 30_000 });
      await expect(pageB.getByRole("heading", { name: "Dashboard" })).toBeVisible();

      // Restore the original admin password so the E2E workspace is reusable.
      await changePassword(pageB, NEW_PASSWORD, ADMIN.password);
      await expect(pageB).toHaveURL(
        (url) => url.pathname === "/login" && url.searchParams.get("changed") === "1",
        { timeout: 30_000 },
      );
      await expect(pageB.getByText(PASSWORD_CHANGED_NOTICE, { exact: true })).toBeVisible();

      await login(pageB, ADMIN.email, ADMIN.password);
      await expect(pageB.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
