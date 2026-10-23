import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const BASE = "postgres://postgres:postgres@localhost:5432";
const DATABASE = "opencode_crm_e2e";
const URL = `${BASE}/${DATABASE}`;

async function main() {
  const admin = postgres(`${BASE}/postgres`, { max: 1, onnotice: () => undefined });
  const existing = await admin`select 1 from pg_database where datname = ${DATABASE}`;
  if (existing.length === 0) {
    await admin.unsafe(`create database "${DATABASE}"`);
  }
  await admin.end();

  const client = postgres(URL, { max: 1, onnotice: () => undefined });
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
  console.log("E2E database prepared at", URL);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
