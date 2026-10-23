import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureDefaultPipeline } from "@/db/ensure-default-pipeline";
import { ensureWorkspaceSettings } from "@/db/ensure-workspace-settings";

const TABLES = [
  "campaign_recipients",
  "campaigns",
  "segments",
  "ticket_comments",
  "tickets",
  "tasks",
  "activities",
  "listing_viewings",
  "listing_photos",
  "listings",
  "deals",
  "workspace_settings",
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
  await db.execute(
    sql.raw(
      `truncate table ${TABLES.map((table) => `"${table}"`).join(", ")} restart identity cascade`,
    ),
  );
  await ensureDefaultPipeline();
  await ensureWorkspaceSettings();
}
