import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findUnsupportedMergeFields,
  renderMergeFields,
} from "@/lib/messaging/render";
import {
  messageGroupSchema,
  messageSchema,
  unsupportedMergeFieldsDescriptor,
} from "@/lib/validation/messaging";
import {
  DEFAULT_MAX_RECIPIENTS,
  FakeTransport,
  getMaxRecipients,
  getTransport,
  isFakeTransport,
  isMessagingConfigured,
  mapTransportError,
  shouldAbortRun,
} from "@/lib/messaging/transport";

const ENV_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "MESSAGING_FROM",
  "MESSAGING_MAX_RECIPIENTS",
  "MESSAGING_TRANSPORT",
] as const;

const savedEnv = new Map<string, string | undefined>();

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv.set(key, process.env[key]);
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("renderMergeFields", () => {
  it("renders every supported field", () => {
    const body = "Hi {{firstName}} {{lastName}} at {{company}}.";
    expect(
      renderMergeFields(body, { firstName: "Ada", lastName: "Lovelace", company: "Acme" }),
    ).toBe("Hi Ada Lovelace at Acme.");
  });

  it("renders missing values as empty strings", () => {
    expect(renderMergeFields("Hi {{firstName}}{{company}}!", { firstName: "Ada" })).toBe("Hi Ada!");
    expect(renderMergeFields("[{{company}}]", { company: null })).toBe("[]");
  });

  it("preserves newlines", () => {
    const body = "Line one\n\nLine two {{firstName}}\n";
    expect(renderMergeFields(body, { firstName: "Ada" })).toBe("Line one\n\nLine two Ada\n");
  });

  it("accepts whitespace inside placeholders", () => {
    expect(renderMergeFields("Hi {{ firstName }}", { firstName: "Ada" })).toBe("Hi Ada");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(renderMergeFields("Hi {{email}}", { firstName: "Ada" })).toBe("Hi {{email}}");
  });
});

describe("findUnsupportedMergeFields", () => {
  it("returns no unsupported fields for a supported body", () => {
    expect(findUnsupportedMergeFields("{{firstName}} {{lastName}} {{company}}")).toEqual([]);
  });

  it("reports unknown placeholders once", () => {
    expect(findUnsupportedMergeFields("{{email}} {{email}} {{lastName}}")).toEqual(["email"]);
  });

  it("ignores stray braces", () => {
    expect(findUnsupportedMergeFields("Use {braces} and {{ company }}")).toEqual([]);
  });
});

describe("isMessagingConfigured", () => {
  it("requires a host and sender address", () => {
    expect(isMessagingConfigured({})).toBe(false);
    expect(isMessagingConfigured({ SMTP_HOST: "smtp.example.com" })).toBe(false);
    expect(isMessagingConfigured({ MESSAGING_FROM: "crm@example.com" })).toBe(false);
    expect(
      isMessagingConfigured({ SMTP_HOST: "smtp.example.com", MESSAGING_FROM: "crm@example.com" }),
    ).toBe(true);
  });

  it("requires a matching username and password pair", () => {
    const base = { SMTP_HOST: "smtp.example.com", MESSAGING_FROM: "crm@example.com" };
    expect(isMessagingConfigured({ ...base, SMTP_USER: "user" })).toBe(false);
    expect(isMessagingConfigured({ ...base, SMTP_PASSWORD: "secret" })).toBe(false);
    expect(isMessagingConfigured({ ...base, SMTP_USER: "user", SMTP_PASSWORD: "secret" })).toBe(
      true,
    );
  });
});

describe("getMaxRecipients", () => {
  it("defaults when unset or invalid", () => {
    expect(getMaxRecipients({})).toBe(DEFAULT_MAX_RECIPIENTS);
    expect(getMaxRecipients({ MESSAGING_MAX_RECIPIENTS: "zero" })).toBe(DEFAULT_MAX_RECIPIENTS);
    expect(getMaxRecipients({ MESSAGING_MAX_RECIPIENTS: "-5" })).toBe(DEFAULT_MAX_RECIPIENTS);
  });

  it("accepts a positive integer and caps the configured maximum", () => {
    expect(getMaxRecipients({ MESSAGING_MAX_RECIPIENTS: "25" })).toBe(25);
    expect(getMaxRecipients({ MESSAGING_MAX_RECIPIENTS: "5000" })).toBe(1000);
  });
});

describe("mapTransportError", () => {
  it("maps nodemailer codes to reasons", () => {
    expect(mapTransportError({ code: "EAUTH" })).toBe("auth");
    expect(mapTransportError({ code: "ECONNECTION" })).toBe("connection");
    expect(mapTransportError({ code: "ESOCKET" })).toBe("connection");
    expect(mapTransportError({ code: "EDNS" })).toBe("connection");
    expect(mapTransportError({ code: "ETIMEDOUT" })).toBe("timeout");
    expect(mapTransportError({ code: "EENVELOPE" })).toBe("rejected");
    expect(mapTransportError({ code: "ENOTFOUND" })).toBe("unknown");
    expect(mapTransportError(new Error("boom"))).toBe("unknown");
    expect(mapTransportError(null)).toBe("unknown");
  });
});

describe("shouldAbortRun", () => {
  it("aborts only on auth and connection failures", () => {
    expect(shouldAbortRun("auth")).toBe(true);
    expect(shouldAbortRun("connection")).toBe(true);
    expect(shouldAbortRun("timeout")).toBe(false);
    expect(shouldAbortRun("rejected")).toBe(false);
    expect(shouldAbortRun("unknown")).toBe(false);
  });
});

describe("getTransport", () => {
  it("returns the fake during tests even when SMTP is configured", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.MESSAGING_FROM = "crm@example.com";
    process.env.MESSAGING_TRANSPORT = "smtp";

    const transport = await getTransport();
    expect(transport).toBeInstanceOf(FakeTransport);
  });

  it("honours the fake override outside tests but not in production", () => {
    expect(isFakeTransport({ NODE_ENV: "development", MESSAGING_TRANSPORT: "fake" })).toBe(true);
    expect(isFakeTransport({ NODE_ENV: "test" })).toBe(true);
    expect(isFakeTransport({ NODE_ENV: "production", MESSAGING_TRANSPORT: "fake" })).toBe(false);
    expect(isFakeTransport({ NODE_ENV: "production" })).toBe(false);
  });
});

describe("FakeTransport", () => {
  it("records attempts and scripts failures", async () => {
    const transport = new FakeTransport([new Error("rejected"), { providerMessageId: "ok-2" }]);
    const email = {
      to: "ada@example.com",
      replyTo: "member@example.com",
      subject: "Hello",
      text: "Body",
      html: "<p>Body</p>",
    };

    await expect(transport.send(email)).rejects.toThrow("rejected");
    await expect(transport.send(email)).resolves.toEqual({ providerMessageId: "ok-2" });
    expect(transport.attempts).toHaveLength(2);
    expect(transport.attempts[1]?.html).toBe("<p>Body</p>");
  });
});

describe("messageSchema", () => {
  const groupId = "11111111-1111-4111-8111-111111111111";
  const segmentId = "22222222-2222-4222-8222-222222222222";
  const base = {
    subject: "A note for you",
    body: "Hi {{firstName}}, a note from {{company}}.",
    groupId,
    segmentId: null,
  };

  it("accepts a valid group message", () => {
    expect(messageSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a valid segment message", () => {
    expect(messageSchema.safeParse({ ...base, groupId: null, segmentId }).success).toBe(true);
  });

  it("accepts an HTML body without a plain-text body", () => {
    expect(
      messageSchema.safeParse({
        ...base,
        body: null,
        bodyHtml: "<p>Hi {{firstName}}</p>",
      }).success,
    ).toBe(true);
    expect(
      messageSchema.safeParse({
        ...base,
        body: null,
        bodyHtml: "<p>Hi {{&nbsp;company&nbsp;}}</p>",
      }).success,
    ).toBe(true);
  });

  it("requires a subject", () => {
    expect(messageSchema.safeParse({ ...base, subject: "" }).success).toBe(false);
  });

  it("rejects line breaks in the subject", () => {
    expect(messageSchema.safeParse({ ...base, subject: "Hello\nBcc: someone" }).success).toBe(false);
  });

  it("rejects a subject over 200 characters", () => {
    expect(messageSchema.safeParse({ ...base, subject: "a".repeat(201) }).success).toBe(false);
  });

  it("requires exactly one body source", () => {
    expect(messageSchema.safeParse({ ...base, body: "   " }).success).toBe(false);
    expect(messageSchema.safeParse({ ...base, body: null, bodyHtml: null }).success).toBe(false);
    expect(
      messageSchema.safeParse({
        ...base,
        body: "Plain",
        bodyHtml: "<p>HTML</p>",
      }).success,
    ).toBe(false);
  });

  it("rejects a body over 10,000 characters", () => {
    expect(messageSchema.safeParse({ ...base, body: "a".repeat(10001) }).success).toBe(false);
  });

  it("rejects HTML over 50,000 characters", () => {
    expect(
      messageSchema.safeParse({
        ...base,
        body: null,
        bodyHtml: `<p>${"a".repeat(50001)}</p>`,
      }).success,
    ).toBe(false);
  });

  it("rejects unsupported placeholders in text", () => {
    expect(messageSchema.safeParse({ ...base, body: "Hi {{email}}" }).success).toBe(false);
  });

  it("requires exactly one audience source", () => {
    expect(messageSchema.safeParse({ ...base, groupId: null, segmentId: null }).success).toBe(false);
    expect(messageSchema.safeParse({ ...base, groupId, segmentId }).success).toBe(false);
  });
});

describe("unsupportedMergeFieldsDescriptor", () => {
  it("returns the unsupported names", () => {
    expect(unsupportedMergeFieldsDescriptor("{{email}} {{phone}}")).toEqual({
      key: "validation.unsupportedMergeField",
      params: { fields: "email, phone" },
    });
  });

  it("returns null for a supported body", () => {
    expect(unsupportedMergeFieldsDescriptor("{{firstName}} {{company}}")).toBeNull();
  });
});

describe("messageGroupSchema", () => {
  it("requires a name and caps its length", () => {
    expect(messageGroupSchema.safeParse({ name: "Renewals" }).success).toBe(true);
    expect(messageGroupSchema.safeParse({ name: "" }).success).toBe(false);
    expect(messageGroupSchema.safeParse({ name: "a".repeat(161) }).success).toBe(false);
  });
});
