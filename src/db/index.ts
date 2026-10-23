import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __crmSql?: ReturnType<typeof postgres>;
};

const sqlClient =
  globalForDb.__crmSql ??
  postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (env.NODE_ENV !== "production") {
  globalForDb.__crmSql = sqlClient;
}

export const db = drizzle(sqlClient, { schema });

export type Database = typeof db;

export function createDb(url: string) {
  const client = postgres(url, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return {
    db: drizzle(client, { schema }),
    client,
  };
}

export { sqlClient };
