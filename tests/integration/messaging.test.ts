import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts, messageRecipients, messages, segments } from "@/db/schema";
import { FakeTransport } from "@/lib/messaging/transport";
import { createSegment } from "@/lib/services/marketing";
import { setContactArchived } from "@/lib/services/contacts";
import {
  addMessageGroupMember,
  cancelMessage,
  createMessage,
  createMessageGroup,
  getContactMessageHistory,
  getMessage,
  getMessageGroup,
  getMessageGroupOptions,
  listMessageGroups,
  listMessages,
  previewMessageAudience,
  removeMessageGroupMember,
  retryMessage,
  sendMessage,
  setContactEmailOptOut,
  setMessageGroupArchived,
  updateMessage,
  updateMessageGroup,
} from "@/lib/services/messaging";
import { createCompany, createContact, createUser } from "./factories";
import { resetDatabase } from "./helpers";

const savedMaxRecipients = process.env.MESSAGING_MAX_RECIPIENTS;

beforeEach(async () => {
  await resetDatabase();
});

afterEach(() => {
  if (savedMaxRecipients === undefined) delete process.env.MESSAGING_MAX_RECIPIENTS;
  else process.env.MESSAGING_MAX_RECIPIENTS = savedMaxRecipients;
});

async function fixture() {
  const admin = await createUser({ role: "admin" });
  const company = await createCompany(admin.id, { name: "Acme Software", industry: "Software" });
  return { admin, company };
}

function transportError(code: string) {
  return Object.assign(new Error(code), { code });
}

async function groupWith(actorId: string, contactIds: string[], name = "Test group") {
  const group = await createMessageGroup({ name, description: null }, actorId);
  for (const contactId of contactIds) {
    await addMessageGroupMember(group.id, contactId, actorId);
  }
  return group;
}

async function draftMessage(
  actorId: string,
  audience: { groupId?: string; segmentId?: string },
  overrides: { subject?: string; body?: string } = {},
) {
  return createMessage(
    {
      subject: overrides.subject ?? "Hello from OpenCRM",
      body: overrides.body ?? "Hi {{firstName}}, a note from {{company}}.",
      groupId: audience.groupId ?? null,
      segmentId: audience.segmentId ?? null,
    },
    actorId,
  );
}

async function recipientsFor(messageId: string) {
  return db
    .select()
    .from(messageRecipients)
    .where(eq(messageRecipients.messageId, messageId));
}

describe("recipient groups", () => {
  it("creates a group, counts members, and ignores duplicates", async () => {
    const { admin, company } = await fixture();
    const contact = await createContact(admin.id, company.id);
    const group = await groupWith(admin.id, [contact.id], "Q1 renewals");

    await addMessageGroupMember(group.id, contact.id, admin.id);

    const loaded = await getMessageGroup(group.id);
    expect(loaded?.members).toHaveLength(1);
    expect(loaded?.name).toBe("Q1 renewals");

    const listed = await listMessageGroups();
    expect(listed[0]?.memberCount).toBe(1);
  });

  it("removes a member without touching the contact", async () => {
    const { admin, company } = await fixture();
    const contact = await createContact(admin.id, company.id);
    const group = await groupWith(admin.id, [contact.id]);

    await removeMessageGroupMember(group.id, contact.id);

    expect((await getMessageGroup(group.id))?.members).toHaveLength(0);
    expect(
      await db.select().from(contacts).where(eq(contacts.id, contact.id)),
    ).toHaveLength(1);
  });

  it("archives a group and rejects further edits", async () => {
    const { admin } = await fixture();
    const group = await createMessageGroup({ name: "Old group", description: null }, admin.id);

    await setMessageGroupArchived(group.id, true);

    expect((await getMessageGroupOptions()).map((option) => option.id)).not.toContain(group.id);
    await expect(
      updateMessageGroup(group.id, { name: "Renamed", description: null }),
    ).rejects.toMatchObject({ code: "ARCHIVED_MESSAGE_GROUP" });
  });

  it("rejects archived contacts as new members", async () => {
    const { admin, company } = await fixture();
    const contact = await createContact(admin.id, company.id, { archivedAt: new Date() });
    const group = await createMessageGroup({ name: "Active group", description: null }, admin.id);

    await expect(addMessageGroupMember(group.id, contact.id, admin.id)).rejects.toMatchObject({
      code: "ARCHIVED_CONTACT",
    });
  });

  it("does not allow member removal from an archived group", async () => {
    const { admin, company } = await fixture();
    const contact = await createContact(admin.id, company.id);
    const group = await groupWith(admin.id, [contact.id]);

    await setMessageGroupArchived(group.id, true);

    await expect(removeMessageGroupMember(group.id, contact.id)).rejects.toMatchObject({
      code: "ARCHIVED_MESSAGE_GROUP",
    });
  });
});

describe("audience preview", () => {
  it("classifies archived, missing-email, and opted-out contacts", async () => {
    const { admin, company } = await fixture();
    const eligible = await createContact(admin.id, company.id, { firstName: "Ada" });
    const archived = await createContact(admin.id, company.id);
    const optedOut = await createContact(admin.id, company.id);
    const missingEmail = await createContact(admin.id, company.id);
    await db.update(contacts).set({ email: "" }).where(eq(contacts.id, missingEmail.id));
    await setContactEmailOptOut(optedOut.id, true);

    const group = await groupWith(admin.id, [
      eligible.id,
      archived.id,
      optedOut.id,
      missingEmail.id,
    ]);
    await db
      .update(contacts)
      .set({ archivedAt: new Date() })
      .where(eq(contacts.id, archived.id));
    const message = await draftMessage(admin.id, { groupId: group.id });

    const preview = await previewMessageAudience(message.id);
    expect(preview).toMatchObject({
      total: 4,
      eligible: 1,
      skipped: { archived: 1, missingEmail: 1, optedOut: 1 },
    });
  });

  it("evaluates a segment audience and excludes archived contacts", async () => {
    const { admin, company } = await fixture();
    await createContact(admin.id, company.id);
    await createContact(admin.id, company.id);
    await createContact(admin.id, company.id, { archivedAt: new Date() });

    const segment = await createSegment(
      { name: "Software contacts", description: null, criteria: { tags: [], industry: "Software" } },
      admin.id,
    );
    const message = await draftMessage(admin.id, { segmentId: segment.id });

    const preview = await previewMessageAudience(message.id);
    expect(preview.total).toBe(2);
    expect(preview.eligible).toBe(2);
    expect(preview.kind).toBe("segment");
  });

  it("rejects an archived segment for a new message", async () => {
    const { admin } = await fixture();
    const segment = await createSegment(
      { name: "Archived", description: null, criteria: { tags: [], industry: "Software" } },
      admin.id,
    );
    await db
      .update(segments)
      .set({ archivedAt: new Date() })
      .where(eq(segments.id, segment.id));

    await expect(
      draftMessage(admin.id, { segmentId: segment.id }),
    ).rejects.toMatchObject({ code: "ARCHIVED_SEGMENT" });
  });
});

describe("message drafts", () => {
  it("edits a draft and blocks edits after sending", async () => {
    const { admin, company } = await fixture();
    const contact = await createContact(admin.id, company.id);
    const group = await groupWith(admin.id, [contact.id]);
    const message = await draftMessage(admin.id, { groupId: group.id });

    await updateMessage(message.id, {
      subject: "Updated subject",
      body: "Updated body",
      groupId: group.id,
      segmentId: null,
    });
    expect((await getMessage(message.id))?.subject).toBe("Updated subject");

    await sendMessage(message.id, admin.id, new FakeTransport());

    await expect(
      updateMessage(message.id, {
        subject: "Too late",
        body: "Too late",
        groupId: group.id,
        segmentId: null,
      }),
    ).rejects.toMatchObject({ code: "INVALID_MESSAGE_STATE" });
  });

  it("lists messages newest first with filters and pagination", async () => {
    const { admin, company } = await fixture();
    const contact = await createContact(admin.id, company.id);
    const group = await groupWith(admin.id, [contact.id]);

    const alpha = await draftMessage(admin.id, { groupId: group.id }, { subject: "Alpha" });
    const beta = await draftMessage(admin.id, { groupId: group.id }, { subject: "Beta" });
    const gamma = await draftMessage(admin.id, { groupId: group.id }, { subject: "Gamma" });

    await db
      .update(messages)
      .set({ createdAt: new Date("2026-01-01T00:00:00.000Z") })
      .where(eq(messages.id, alpha.id));
    await db
      .update(messages)
      .set({ createdAt: new Date("2026-01-02T00:00:00.000Z") })
      .where(eq(messages.id, beta.id));
    await db
      .update(messages)
      .set({ createdAt: new Date("2026-01-03T00:00:00.000Z") })
      .where(eq(messages.id, gamma.id));

    const firstPage = await listMessages({ q: "", page: 1, pageSize: 2 });
    expect(firstPage.items.map((item) => item.subject)).toEqual(["Gamma", "Beta"]);
    expect(firstPage.pageCount).toBe(2);

    const search = await listMessages({ q: "Bet", page: 1, pageSize: 20 });
    expect(search.items.map((item) => item.subject)).toEqual(["Beta"]);

    const filtered = await listMessages({ q: "", status: "draft", page: 1, pageSize: 20 });
    expect(filtered.items).toHaveLength(3);
  });
});

describe("sending", () => {
  it("freezes the audience and renders merge fields", async () => {
    const { admin, company } = await fixture();
    const ada = await createContact(admin.id, company.id, {
      firstName: "Ada",
      lastName: "Lovelace",
    });
    const grace = await createContact(admin.id, company.id, { firstName: "Grace" });
    const group = await groupWith(admin.id, [ada.id, grace.id], "Q1 renewals");
    const message = await draftMessage(
      admin.id,
      { groupId: group.id },
      { body: "Hi {{firstName}} at {{company}}." },
    );

    const transport = new FakeTransport();
    const completed = await sendMessage(message.id, admin.id, transport);

    expect(completed.status).toBe("completed");
    expect(transport.attempts).toHaveLength(2);
    expect(transport.attempts.find((attempt) => attempt.to === ada.email)?.text).toBe(
      "Hi Ada at Acme Software.",
    );

    const later = await createContact(admin.id, company.id, { firstName: "Katherine" });
    await addMessageGroupMember(group.id, later.id, admin.id);
    await updateMessageGroup(group.id, { name: "Renamed group", description: null });

    const loaded = await getMessage(message.id);
    expect(loaded?.recipients).toHaveLength(2);
    expect(loaded?.audienceSnapshot?.name).toBe("Q1 renewals");
    expect(loaded?.audienceName).toBe("Q1 renewals");
  });

  it("stores skipped recipients without contacting them", async () => {
    const { admin, company } = await fixture();
    const eligible = await createContact(admin.id, company.id);
    const optedOut = await createContact(admin.id, company.id);
    await setContactEmailOptOut(optedOut.id, true);
    const archived = await createContact(admin.id, company.id);
    const group = await groupWith(admin.id, [eligible.id, optedOut.id, archived.id]);
    await db
      .update(contacts)
      .set({ archivedAt: new Date() })
      .where(eq(contacts.id, archived.id));
    const message = await draftMessage(admin.id, { groupId: group.id });

    const transport = new FakeTransport();
    await sendMessage(message.id, admin.id, transport);

    expect(transport.attempts).toHaveLength(1);
    const rows = await recipientsFor(message.id);
    expect(rows.find((row) => row.contactId === optedOut.id)).toMatchObject({
      status: "skipped",
      reason: "opted_out",
    });
    expect(rows.find((row) => row.contactId === archived.id)).toMatchObject({
      status: "skipped",
      reason: "archived",
    });
  });

  it("blocks a send with no eligible recipients", async () => {
    const { admin, company } = await fixture();
    const optedOut = await createContact(admin.id, company.id);
    await setContactEmailOptOut(optedOut.id, true);
    const group = await groupWith(admin.id, [optedOut.id]);
    const message = await draftMessage(admin.id, { groupId: group.id });

    await expect(sendMessage(message.id, admin.id, new FakeTransport())).rejects.toMatchObject({
      code: "NO_ELIGIBLE_RECIPIENTS",
    });
    expect(await recipientsFor(message.id)).toHaveLength(0);
    expect((await getMessage(message.id))?.status).toBe("draft");
  });

  it("enforces the recipient cap on eligible recipients", async () => {
    const { admin, company } = await fixture();
    const first = await createContact(admin.id, company.id);
    const second = await createContact(admin.id, company.id);
    const group = await groupWith(admin.id, [first.id, second.id]);
    const message = await draftMessage(admin.id, { groupId: group.id });

    process.env.MESSAGING_MAX_RECIPIENTS = "1";
    await expect(sendMessage(message.id, admin.id, new FakeTransport())).rejects.toMatchObject({
      code: "RECIPIENT_LIMIT_EXCEEDED",
      params: { limit: 1 },
    });
    expect(await recipientsFor(message.id)).toHaveLength(0);

    process.env.MESSAGING_MAX_RECIPIENTS = "2";
    const completed = await sendMessage(message.id, admin.id, new FakeTransport());
    expect(completed.status).toBe("completed");
  });

  it("continues after a per-recipient failure", async () => {
    const { admin, company } = await fixture();
    const first = await createContact(admin.id, company.id, { email: "first@example.com" });
    const second = await createContact(admin.id, company.id, { email: "second@example.com" });
    const third = await createContact(admin.id, company.id, { email: "third@example.com" });
    const group = await groupWith(admin.id, [first.id, second.id, third.id]);
    const message = await draftMessage(admin.id, { groupId: group.id });

    const transport = new FakeTransport([
      { providerMessageId: "one" },
      transportError("EENVELOPE"),
      { providerMessageId: "three" },
    ]);
    const completed = await sendMessage(message.id, admin.id, transport);

    expect(transport.attempts).toHaveLength(3);
    expect(completed.status).toBe("completed");

    const rows = await recipientsFor(message.id);
    expect(rows.filter((row) => row.status === "sent")).toHaveLength(2);
    expect(rows.find((row) => row.status === "failed")).toMatchObject({
      reason: "rejected",
    });
  });

  it("aborts the run on an auth failure and leaves queued recipients", async () => {
    const { admin, company } = await fixture();
    const first = await createContact(admin.id, company.id, { email: "first@example.com" });
    const second = await createContact(admin.id, company.id, { email: "second@example.com" });
    const group = await groupWith(admin.id, [first.id, second.id]);
    const message = await draftMessage(admin.id, { groupId: group.id });

    const transport = new FakeTransport([transportError("EAUTH")]);
    const result = await sendMessage(message.id, admin.id, transport);

    expect(result.status).toBe("sending");
    const rows = await recipientsFor(message.id);
    expect(rows.filter((row) => row.status === "failed")).toHaveLength(1);
    expect(rows.filter((row) => row.status === "queued")).toHaveLength(1);
  });

  it("rejects a second send of the same message", async () => {
    const { admin, company } = await fixture();
    const contact = await createContact(admin.id, company.id);
    const group = await groupWith(admin.id, [contact.id]);
    const message = await draftMessage(admin.id, { groupId: group.id });

    await sendMessage(message.id, admin.id, new FakeTransport());
    await expect(sendMessage(message.id, admin.id, new FakeTransport())).rejects.toMatchObject({
      code: "INVALID_MESSAGE_STATE",
    });
  });
});

describe("retry and cancel", () => {
  it("retries only queued and failed recipients", async () => {
    const { admin, company } = await fixture();
    const first = await createContact(admin.id, company.id, { email: "first@example.com" });
    const second = await createContact(admin.id, company.id, { email: "second@example.com" });
    const third = await createContact(admin.id, company.id, { email: "third@example.com" });
    const group = await groupWith(admin.id, [first.id, second.id, third.id]);
    const message = await draftMessage(admin.id, { groupId: group.id });

    await sendMessage(
      message.id,
      admin.id,
      new FakeTransport([
        { providerMessageId: "one" },
        transportError("EENVELOPE"),
        { providerMessageId: "three" },
      ]),
    );

    const failedBeforeRetry = (await recipientsFor(message.id)).find(
      (row) => row.status === "failed",
    );
    const retry = new FakeTransport();
    const completed = await retryMessage(message.id, admin.id, retry);

    expect(completed.status).toBe("completed");
    expect(retry.attempts).toHaveLength(1);
    expect(retry.attempts[0]?.to).toBe(failedBeforeRetry?.address);
  });

  it("rejects a retry while another run is active", async () => {
    const { admin, company } = await fixture();
    const contact = await createContact(admin.id, company.id);
    const group = await groupWith(admin.id, [contact.id]);
    const message = await draftMessage(admin.id, { groupId: group.id });

    await db
      .update(messages)
      .set({ status: "sending", runStartedAt: new Date() })
      .where(eq(messages.id, message.id));

    await expect(retryMessage(message.id, admin.id, new FakeTransport())).rejects.toMatchObject({
      code: "SEND_IN_PROGRESS",
    });
  });

  it("skips a contact who opts out after an interrupted send", async () => {
    const { admin, company } = await fixture();
    const first = await createContact(admin.id, company.id, { email: "first@example.com" });
    const second = await createContact(admin.id, company.id, { email: "second@example.com" });
    const group = await groupWith(admin.id, [first.id, second.id]);
    const message = await draftMessage(admin.id, { groupId: group.id });

    await sendMessage(message.id, admin.id, new FakeTransport([transportError("EAUTH")]));

    const queued = (await recipientsFor(message.id)).find((row) => row.status === "queued");
    if (!queued) throw new Error("Expected a queued recipient");
    await setContactEmailOptOut(queued.contactId, true);

    const retry = new FakeTransport();
    await retryMessage(message.id, admin.id, retry);

    expect(retry.attempts.map((attempt) => attempt.to)).not.toContain(queued.address);
    const after = (await recipientsFor(message.id)).find(
      (row) => row.contactId === queued.contactId,
    );
    expect(after).toMatchObject({ status: "skipped", reason: "opted_out" });
  });

  it("does not retry skipped recipients", async () => {
    const { admin, company } = await fixture();
    const eligible = await createContact(admin.id, company.id);
    const optedOut = await createContact(admin.id, company.id);
    await setContactEmailOptOut(optedOut.id, true);
    const group = await groupWith(admin.id, [eligible.id, optedOut.id]);
    const message = await draftMessage(admin.id, { groupId: group.id });

    await sendMessage(message.id, admin.id, new FakeTransport());
    const retry = new FakeTransport();
    await expect(retryMessage(message.id, admin.id, retry)).rejects.toMatchObject({
      code: "INVALID_MESSAGE_STATE",
    });
    expect(retry.attempts).toHaveLength(0);
  });

  it("cancels a stuck send and skips remaining queued recipients", async () => {
    const { admin, company } = await fixture();
    const first = await createContact(admin.id, company.id, { email: "first@example.com" });
    const second = await createContact(admin.id, company.id, { email: "second@example.com" });
    const group = await groupWith(admin.id, [first.id, second.id]);
    const message = await draftMessage(admin.id, { groupId: group.id });

    await sendMessage(message.id, admin.id, new FakeTransport([transportError("EAUTH")]));
    const cancelled = await cancelMessage(message.id);

    expect(cancelled.status).toBe("cancelled");
    const rows = await recipientsFor(message.id);
    expect(rows.find((row) => row.status === "failed")).toBeTruthy();
    expect(rows.find((row) => row.status === "skipped")).toMatchObject({ reason: "cancelled" });

    await expect(cancelMessage(message.id)).rejects.toMatchObject({
      code: "INVALID_MESSAGE_STATE",
    });
  });
});

describe("contact opt-out and history", () => {
  it("keeps the opt-out state across archive and restore", async () => {
    const { admin, company } = await fixture();
    const contact = await createContact(admin.id, company.id);

    await setContactEmailOptOut(contact.id, true);
    await setContactArchived(contact.id, true);
    await setContactArchived(contact.id, false);

    const [loaded] = await db.select().from(contacts).where(eq(contacts.id, contact.id));
    expect(loaded?.emailOptOutAt).toBeInstanceOf(Date);
  });

  it("lists contact message history newest first with outcomes", async () => {
    const { admin, company } = await fixture();
    const contact = await createContact(admin.id, company.id);
    const other = await createContact(admin.id, company.id);
    const group = await groupWith(admin.id, [contact.id, other.id]);

    const older = await draftMessage(admin.id, { groupId: group.id }, { subject: "Older" });
    await sendMessage(older.id, admin.id, new FakeTransport());
    await db
      .update(messages)
      .set({ createdAt: new Date("2026-01-01T00:00:00.000Z") })
      .where(eq(messages.id, older.id));

    const newer = await draftMessage(admin.id, { groupId: group.id }, { subject: "Newer" });
    await sendMessage(newer.id, admin.id, new FakeTransport());

    await setContactEmailOptOut(contact.id, true);
    const skipped = await draftMessage(admin.id, { groupId: group.id }, { subject: "Skipped" });
    await sendMessage(skipped.id, admin.id, new FakeTransport());

    await db
      .update(messages)
      .set({ createdAt: new Date("2026-01-01T00:00:00.000Z") })
      .where(eq(messages.id, older.id));
    await db
      .update(messages)
      .set({ createdAt: new Date("2026-01-02T00:00:00.000Z") })
      .where(eq(messages.id, newer.id));
    await db
      .update(messages)
      .set({ createdAt: new Date("2026-01-03T00:00:00.000Z") })
      .where(eq(messages.id, skipped.id));

    const history = await getContactMessageHistory(contact.id);
    expect(history.map((entry) => entry.subject)).toEqual(["Skipped", "Newer", "Older"]);
    expect(history[0]).toMatchObject({ status: "skipped", reason: "opted_out" });
  });
});
