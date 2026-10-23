import { config } from "dotenv";
config();
config({ path: ".env.local", override: true });

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/opencode_crm",
  },
  strict: true,
  verbose: true,
});
