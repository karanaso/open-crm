# Listings migration and rollback

Migration `drizzle/0003_wise_the_initiative.sql` adds workspace settings, the real
estate listing tables, deal currency and listing fields, and listing links on
activities and tasks. `drizzle/0004_graceful_reaper.sql` tightens the rent-period check
so a rent listing with a null period is rejected instead of passing as a SQL `NULL`
check expression.

## Preflight

Every deal must have a contact before `deals.contact_id` can become `NOT NULL`.
Run this against the target database and stop if the result is not zero:

```sql
SELECT count(*) FROM "deals" WHERE "contact_id" IS NULL;
```

The migration also contains a guard that raises an exception with the number of
offending deals, so a missed preflight fails the migration instead of inventing a
placeholder contact. Reassign or archive those deals first.

Take a database backup (and an image-storage backup, if listings already exist)
before applying the migration.

## What the migration changes

1. Creates `workspace_settings` and inserts the singleton `default` row with
   `default_currency = 'USD'` and `time_zone = 'UTC'` using `ON CONFLICT DO NOTHING`.
2. Creates the listing enums: `listing_transaction`, `listing_status`, `rent_period`,
   `property_type`, `viewing_status`, and `energy_class`.
3. Creates `listings` with the reference/price/status indexes and the
   `jsonb_path_ops` GIN index on `features`.
4. Creates `listing_photos` and `listing_viewings`.
5. Adds `deals.listing_id`, `deals.property_price`, and `deals.currency`. The currency
   column is added with `DEFAULT 'USD' NOT NULL`, which backfills existing deals to
   USD; property price is nullable.
6. Makes `deals.contact_id` `NOT NULL` and `deals.company_id` nullable, then adds the
   property-price and currency checks and indexes.
7. Adds `activities.listing_id` and `tasks.listing_id` and recreates both
   `num_nonnulls(...) >= 1` checks to include listings.
8. Migration 0004 replaces `listings_price_period_check` with a strict version.

Apply and verify:

```bash
pnpm db:migrate
pnpm db:seed
psql "$DATABASE_URL" -c "select * from workspace_settings;"
psql "$DATABASE_URL" -c "\d+ listings"
```

`ensureWorkspaceSettings()` in `src/db/ensure-workspace-settings.ts` is idempotent and
is used by the seed and by the integration test reset helper. It does not change
existing settings.

## Rollback

Rollback is only safe before listings and listing-linked deals exist in production.
After that, dropping the tables destroys listing, photo, viewing, and activity data.
Back up the database and `IMAGE_STORAGE_DIR` first (see `docs/listing-storage.md`).

Run the whole block in one transaction. The guard fails if any deal still has no
company, because `deals.company_id` must return to `NOT NULL`.

```sql
BEGIN;

-- 1. Remove listing links from activities and tasks, restoring the old checks.
ALTER TABLE "activities" DROP CONSTRAINT "activities_link_check";
ALTER TABLE "activities" ADD CONSTRAINT "activities_link_check"
  CHECK (num_nonnulls("company_id", "contact_id", "deal_id", "ticket_id", "campaign_id") >= 1);
ALTER TABLE "activities" DROP COLUMN "listing_id";

ALTER TABLE "tasks" DROP CONSTRAINT "tasks_link_check";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_link_check"
  CHECK (num_nonnulls("company_id", "contact_id", "deal_id", "ticket_id", "campaign_id") >= 1);
ALTER TABLE "tasks" DROP COLUMN "listing_id";

-- 2. Remove deal listing/currency fields.
ALTER TABLE "deals" DROP CONSTRAINT "deals_property_price_check";
ALTER TABLE "deals" DROP CONSTRAINT "deals_currency_check";
ALTER TABLE "deals" DROP COLUMN "listing_id";
ALTER TABLE "deals" DROP COLUMN "property_price";
ALTER TABLE "deals" DROP COLUMN "currency";

-- 3. Verify every deal has a company before restoring NOT NULL.
DO $$
DECLARE
  missing_companies integer;
BEGIN
  SELECT count(*) INTO missing_companies FROM "deals" WHERE "company_id" IS NULL;
  IF missing_companies > 0 THEN
    RAISE EXCEPTION 'Cannot restore deals.company_id NOT NULL: % deal(s) have no company.', missing_companies;
  END IF;
END $$;

ALTER TABLE "deals" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "deals" ALTER COLUMN "contact_id" DROP NOT NULL;

-- 4. Drop listing tables.
DROP TABLE IF EXISTS "listing_viewings";
DROP TABLE IF EXISTS "listing_photos";
DROP TABLE IF EXISTS "listings";

-- 5. Drop workspace settings and enums.
DROP TABLE IF EXISTS "workspace_settings";
DROP TYPE IF EXISTS "viewing_status";
DROP TYPE IF EXISTS "rent_period";
DROP TYPE IF EXISTS "property_type";
DROP TYPE IF EXISTS "listing_transaction";
DROP TYPE IF EXISTS "listing_status";
DROP TYPE IF EXISTS "energy_class";

COMMIT;
```

After a rollback, remove the corresponding entry from `drizzle/meta/_journal.json`
only if you are also removing the migration file; otherwise the migration runner will
consider the migration applied and skip it. Prefer restoring the database backup for a
real production rollback.

## Rehearsal on the test database

Rehearse the rollback SQL without persisting it by wrapping the block in a transaction
and rolling back. This works on `opencode_crm_test` after the integration schema reset:

```bash
psql "postgres://postgres:postgres@localhost:5432/opencode_crm_test" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
-- paste the rollback statements above, excluding BEGIN/COMMIT
ROLLBACK;
SQL
```

Then confirm the schema still has the new columns and rerun
`pnpm test:integration` to prove the reset applies every migration from scratch.
