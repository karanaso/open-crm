import { expect, test } from "@playwright/test";
import { ADMIN, MEMBER, login, logout } from "./helpers";

test.describe.configure({ mode: "serial" });

let inviteUrl = "";

test.describe("authentication and team onboarding", () => {
  test("first-run setup creates the workspace admin", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/setup");
    await page.fill("#name", ADMIN.name);
    await page.fill("#email", ADMIN.email);
    await page.fill("#password", ADMIN.password);
    await page.click("button[type=submit]");
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("admin creates an invitation", async ({ page }) => {
    await login(page);
    await page.goto("/settings/team");
    await page.fill("#invite-email", MEMBER.email);
    await page.selectOption("#invite-role", "member");
    await page.click("button[type=submit]");
    await expect(page.getByText("Invitation created for")).toBeVisible();
    inviteUrl = await page.locator('input[readonly]').inputValue();
    expect(inviteUrl).toContain("/invite/");
    await logout(page);
  });

  test("invitee joins and sees member-level settings", async ({ page }) => {
    await page.goto(inviteUrl);
    await page.fill("#name", MEMBER.name);
    await page.fill("#password", MEMBER.password);
    await page.click("button[type=submit]");
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.goto("/settings");
    await expect(page.getByText("Profile and password")).toBeVisible();
    await expect(page.getByText("Team administration")).toHaveCount(0);
    await expect(page.getByText("Pipelines", { exact: true })).toHaveCount(0);

    await page.goto("/settings/team");
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await page.goto("/settings/pipelines");
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await logout(page);
  });

  test("deactivated members cannot sign in", async ({ page }) => {
    await login(page);
    await page.goto("/settings/team");
    page.on("dialog", (dialog) => dialog.accept());
    const memberRow = page.locator("tr", { hasText: MEMBER.email });
    await memberRow.getByRole("button", { name: "Deactivate" }).click();
    await expect(
      page.locator("tr", { hasText: MEMBER.email }).getByText("inactive", { exact: true }),
    ).toBeVisible();
    await logout(page);

    await page.goto("/login");
    await page.fill("#email", MEMBER.email);
    await page.fill("#password", MEMBER.password);
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Unable to sign in")).toBeVisible();
  });
});
