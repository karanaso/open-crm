export type OutboundEmail = {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendResult = {
  providerMessageId?: string;
};

export interface EmailTransport {
  send(email: OutboundEmail): Promise<SendResult>;
  close?(): void;
}

export const DEFAULT_MAX_RECIPIENTS = 100;
export const MAX_RECIPIENTS_LIMIT = 1000;

export type TransportFailureReason = "auth" | "connection" | "timeout" | "rejected" | "unknown";

export class FakeTransport implements EmailTransport {
  readonly attempts: OutboundEmail[] = [];
  private readonly results: Array<SendResult | Error>;

  constructor(results: Array<SendResult | Error> = []) {
    this.results = [...results];
  }

  async send(email: OutboundEmail): Promise<SendResult> {
    this.attempts.push(email);
    const next = this.results.shift();
    if (next instanceof Error) throw next;
    return next ?? { providerMessageId: `fake-${this.attempts.length}` };
  }
}

export function isMessagingConfigured(env: Record<string, string | undefined> = process.env): boolean {
  const host = env.SMTP_HOST?.trim();
  const from = env.MESSAGING_FROM?.trim();
  const user = env.SMTP_USER?.trim();
  const password = env.SMTP_PASSWORD?.trim();

  if (!host || !from) return false;
  if (user && !password) return false;
  if (password && !user) return false;
  return true;
}

export function getMaxRecipients(env: Record<string, string | undefined> = process.env): number {
  const raw = env.MESSAGING_MAX_RECIPIENTS?.trim();
  if (!raw) return DEFAULT_MAX_RECIPIENTS;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return DEFAULT_MAX_RECIPIENTS;
  return Math.min(value, MAX_RECIPIENTS_LIMIT);
}

export function isFakeTransport(env: Record<string, string | undefined> = process.env): boolean {
  if (env.NODE_ENV === "test") return true;
  return env.NODE_ENV !== "production" && env.MESSAGING_TRANSPORT === "fake";
}

export function mapTransportError(error: unknown): TransportFailureReason {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

  switch (code) {
    case "EAUTH":
      return "auth";
    case "ECONNECTION":
    case "ESOCKET":
    case "EDNS":
      return "connection";
    case "ETIMEDOUT":
      return "timeout";
    case "EENVELOPE":
      return "rejected";
    default:
      return "unknown";
  }
}

export function shouldAbortRun(reason: TransportFailureReason): boolean {
  return reason === "auth" || reason === "connection";
}

export async function getTransport(): Promise<EmailTransport> {
  if (isFakeTransport()) return new FakeTransport();
  const { createSmtpTransport } = await import("./smtp");
  return createSmtpTransport();
}
