import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureDefaultPipeline } from "@/db/ensure-default-pipeline";

const TABLES = [
  "campaign_recipients",
  "campaigns",
  "segments",
  "ticket_comments",
  "tickets",
  "tasks",
  "activities",
  "deals",
  "stages",
  "pipelines",
  "contact_tags",
  "company_tags",
  "contacts",
  "companies",
  "tags",
  "password_reset_tokens",
  "invites",
  "login_attempts",
  "users",
];

export async function resetDatabase() {
  await db.execute(sql.raw(`truncate table ${TABLES.map((table) => `"${table}"`).join(", ")} restart identity cascade`));
  await ensureDefaultPipeline();
}
