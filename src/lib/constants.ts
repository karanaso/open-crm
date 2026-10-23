export const APP_NAME = "OpenCRM";

export const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "dashboard" },
  { href: "/companies", labelKey: "companies" },
  { href: "/contacts", labelKey: "contacts" },
  { href: "/deals", labelKey: "deals" },
  { href: "/tickets", labelKey: "tickets" },
  { href: "/campaigns", labelKey: "campaigns" },
  { href: "/tasks", labelKey: "tasks" },
  { href: "/settings", labelKey: "settings" },
] as const;

export const ACTIVE_TICKET_STATUSES = ["open", "in_progress", "pending"] as const;

export const TICKET_STATUSES = ["open", "in_progress", "pending", "resolved", "closed"] as const;
export const TICKET_PRIORITIES = ["urgent", "high", "normal", "low"] as const;
export const TASK_PRIORITIES = ["low", "normal", "high"] as const;
export const TASK_STATUSES = ["open", "completed"] as const;
export const DEAL_STATUSES = ["open", "won", "lost"] as const;
export const STAGE_OUTCOMES = ["open", "won", "lost"] as const;
export const ACTIVITY_TYPES = ["note", "call", "email", "meeting"] as const;
export const CAMPAIGN_CHANNELS = ["email", "phone", "event", "social", "other"] as const;
export const CAMPAIGN_STATUSES = ["draft", "active", "completed", "archived"] as const;
export const RECIPIENT_STATUSES = [
  "targeted",
  "sent",
  "opened",
  "clicked",
  "responded",
  "converted",
] as const;

export const SLA_HOURS = {
  urgent: { firstResponse: 1, resolution: 8 },
  high: { firstResponse: 4, resolution: 24 },
  normal: { firstResponse: 8, resolution: 48 },
  low: { firstResponse: 24, resolution: 72 },
} as const;

export const MAX_PAGE_SIZE = 100;
export const MAX_CSV_BYTES = 5 * 1024 * 1024;
export const MAX_CSV_ROWS = 5000;
export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 40;
export const MAX_ACTIVITY_BODY = 10000;
