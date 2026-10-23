import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/opencode_crm_test";

export default async function setup() {
  const client = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => undefined });
  await client.unsafe("drop schema if exists public cascade; create schema public;");

  const drizzleDir = path.resolve(process.cwd(), "drizzle");
  const files = (await readdir(drizzleDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const contents = await readFile(path.join(drizzleDir, file), "utf8");
    for (const statement of contents.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) await client.unsafe(trimmed);
    }
  }

  await client.end();
}
