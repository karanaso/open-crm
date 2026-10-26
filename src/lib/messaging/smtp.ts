import { createTransport } from "nodemailer";
import {
  isMessagingConfigured,
  type EmailTransport,
  type OutboundEmail,
  type SendResult,
} from "./transport";

const CONNECTION_TIMEOUT_MS = 10_000;
const GREETING_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 15_000;

export function createSmtpTransport(): EmailTransport {
  if (!isMessagingConfigured()) {
    throw new Error("Messaging transport is not configured.");
  }

  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.MESSAGING_FROM?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);

  const transporter = createTransport({
    host,
    port: Number.isInteger(port) && port > 0 ? port : 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: user ? { user, pass: password ?? "" } : undefined,
    requireTLS: Boolean(user) && process.env.SMTP_ALLOW_PLAINTEXT !== "true",
    pool: true,
    maxConnections: 1,
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: GREETING_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
  });

  return {
    async send(email: OutboundEmail): Promise<SendResult> {
      const info = await transporter.sendMail({
        from,
        to: email.to,
        replyTo: email.replyTo,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
      return {
        providerMessageId: typeof info.messageId === "string" ? info.messageId : undefined,
      };
    },
    close() {
      transporter.close();
    },
  };
}
