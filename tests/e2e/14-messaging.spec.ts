import { expect, test } from "@playwright/test";
import { createContact, login } from "./helpers";

test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const contact = {
  firstName: "Mia",
  lastName: `Message${stamp}`,
  email: `mia.message.${stamp}@example.com`,
};
const groupName = `E2E recipients ${stamp}`;
const subject = `E2E message ${stamp}`;
const blockedSubject = `E2E blocked ${stamp}`;

let groupId = "";
let contactUrl = "";

test("send a message to a hand-picked group", async ({ page }) => {
  await login(page);
  await createContact(page, contact.firstName, contact.lastName, contact.email);
  contactUrl = page.url();

  await page.goto("/messages/groups/new");
  await expect(page.getByRole("heading", { name: "New group" })).toBeVisible();
  await page.fill("#name", groupName);
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForURL(/\/messages\/groups\/[0-9a-f-]+$/);
  groupId = page.url().split("/").pop() ?? "";
  await expect(page.getByRole("heading", { name: groupName })).toBeVisible();

  await page.selectOption("#contactId", {
    label: `${contact.firstName} ${contact.lastName} · ${contact.email}`,
  });
  await page.getByRole("button", { name: "Add contact" }).click();
  await expect(
    page.getByRole("link", { name: `${contact.firstName} ${contact.lastName}` }),
  ).toBeVisible();

  await page.route("https://example.com/e2e-logo.png", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGQAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  });

  await page.goto("/messages/new");
  await page.fill("#subject", subject);
  const editor = page.getByRole("textbox", { name: "Message" });
  await editor.fill("Hi {{firstName}}, a relationship email from {{company}}.");
  await editor.press("Control+A");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await page.getByRole("button", { name: "Link", exact: true }).click();
  await page.getByLabel("Link URL").fill("https://example.com/relationship");
  await page.getByRole("dialog").getByRole("button", { name: "Insert link" }).click();
  await editor.click();
  await editor.press("Control+End");
  await page.getByRole("button", { name: "Image", exact: true }).click();
  await page.getByLabel("Image URL").fill("https://example.com/e2e-logo.png");
  await page.getByLabel("Alternative text").fill("E2E logo");
  await page.getByRole("dialog").getByRole("button", { name: "Insert image" }).click();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await page.selectOption("#groupId", groupId);
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForURL(/\/messages\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: subject })).toBeVisible();

  const savedEditor = page.locator(".ProseMirror");
  await expect(savedEditor.locator("strong")).toContainText("relationship email");
  await expect(
    savedEditor.locator('a[href="https://example.com/relationship"]'),
  ).toBeVisible();
  await expect(savedEditor.locator('img[src="https://example.com/e2e-logo.png"]')).toBeVisible();

  await page.getByRole("button", { name: "Review and send" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Send", exact: true }).click();
  await page.waitForURL(/\/messages\/[0-9a-f-]+$/);
  await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible();

  const recipientRow = page.getByRole("row", {
    name: new RegExp(`${contact.firstName} ${contact.lastName}`),
  });
  await expect(recipientRow.getByText("Sent", { exact: true })).toBeVisible();

  await page.goto("/messages?status=completed");
  await expect(page.getByRole("link", { name: subject })).toBeVisible();

  await page.goto("/messages?q=no-such-subject");
  await expect(page.getByText("No matching messages")).toBeVisible();
});

test("do-not-email blocks the next send and shows history", async ({ page }) => {
  await login(page);
  await page.goto(contactUrl);
  await expect(page.getByRole("link", { name: subject })).toBeVisible();

  await page.getByRole("button", { name: "Mark do not email" }).click();
  await expect(page.getByText("Do not email", { exact: true })).toBeVisible();

  await page.goto("/messages/new");
  await page.fill("#subject", blockedSubject);
  await page.getByRole("textbox", { name: "Message" }).fill("This should not be sent.");
  await page.selectOption("#groupId", groupId);
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForURL(/\/messages\/[0-9a-f-]+$/);

  await expect(
    page.getByText("No recipient is eligible, so this message cannot be sent."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
});
