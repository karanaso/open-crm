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

  await page.goto("/messages/new");
  await page.fill("#subject", subject);
  await page.fill("#body", "Hi {{firstName}}, a relationship email from {{company}}.");
  await page.selectOption("#groupId", groupId);
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForURL(/\/messages\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: subject })).toBeVisible();

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
  await page.fill("#body", "This should not be sent.");
  await page.selectOption("#groupId", groupId);
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForURL(/\/messages\/[0-9a-f-]+$/);

  await expect(
    page.getByText("No recipient is eligible, so this message cannot be sent."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeDisabled();
});
