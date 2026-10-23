# Design

## Context

See `proposal.md` for motivation and `specs/` for the behavior contract. The current codebase is a Next.js 15 App Router application with Drizzle/PostgreSQL, Auth.js, per-module services, Server Actions, and bilingual message catalogs.

Constraints that shape the approach:

- `deals.company_id` is `NOT NULL`; `deals.contact_id` is nullable; deals are joined to companies with `innerJoin`.
- `activities` and `tasks` have a closed set of five record links plus `num_nonnulls(...) >= 1` checks.
- Money formatting is hardcoded to USD; date formatting is hardcoded to UTC.
- There is no workspace settings table, no file storage, and no public API.
- The app runs as a standalone Next.js build; runtime filesystem writes need an explicit persistent location.
- `serverActions.bodySizeLimit` is already `8mb`.
- Auth middleware matches app routes only, so `/api/public/*` is naturally outside the session guard.
- The default pipeline, directory, dashboard, search, and timeline service shapes are already established and should be extended rather than replaced.

## Goals / Non-Goals

**Goals:**

- Add a first-class listing record with sale/rent pricing, one-time commission, grouped features, seller and agent links, photos, viewings, filters, and a module overview.
- Make deals represent both company buyers and individual buyers without sentinel records.
- Preserve commission metrics while allowing per-record currencies, with no cross-currency totals.
- Add a public read-only listing API with an explicit privacy boundary.
- Reuse the existing directory, timeline, tasks, search, dashboard, validation, and localization patterns.

**Non-Goals:**

- Tenancy, rent collection, maintenance, or lease management.
- Public HTML listing pages, SEO, or a public inquiry workflow.
- FX conversion or a single converted reporting total.
- Co-owner seller tables, listing documents, MLS import, or per-agent record permissions.
- A generic polymorphic link table; the existing fixed-link model is extended instead.
- A global calendar in this change; viewings start listing-scoped.

## Decisions

### 1. One listings table with a transaction discriminator

Sale and rent listings share the seller, address, features, photos, status, viewings, and timeline. Only price semantics and the rent period differ.

```text
listings
  transaction  sale | rent
  status       active | inactive
  price, price_period, currency, commission_amount
```

Alternatives considered: separate `sale_listings` and `rent_listings` tables (duplicates every query and relation), and reusing deals as inventory (a listing has many interested buyers; a deal has one counterparty). Both were rejected.

A separate `properties` table is deferred. Re-listing history and price history are not modeled yet; if they become necessary, listings can later reference a property record.

### 2. Typed core columns plus grouped JSONB features

Hot filters and numeric facts are typed columns: `property_type`, `bedrooms`, `bathrooms`, `size_sqm`, `lot_sqm`, `year_built`, `floors`, `parking`, `energy_class`. The long-tail booleans live in one `features jsonb` column preserving the supplied groups.

```json
{
  "location": { "viewOfCoast": true, "gatedCommunity": true },
  "yard": { "swimmingPool": true, "spa": true },
  "kitchen": { "islands": true }
}
```

- `src/lib/listing-features.ts` owns the catalog: group ids, stable keys, label keys, and type. Zod derives an allowlist so unknown keys are rejected.
- Sparse storage: only selected/true keys are written; missing keys mean false.
- A GIN index with `jsonb_path_ops` supports containment filters. Multiple selected features become one nested containment object, so `features @> ...` answers "all of these".
- The form submits one serialized feature object from a client component; the server re-validates it.

Alternatives considered: one table per feature group (eighteen joins and writes), an EAV/`listing_features` join table (better for facet counts, worse for single-record reads), and a separate column per feature (unmaintainable migrations). JSONB is the best fit for a small-team CRM with typed hot filters. If feature facets become a core workload, a derived `listing_features` index table can be added later without changing the source of truth.

### 3. Contact required, company optional on deals

```text
deals
  contact_id      NOT NULL  -> contacts
  company_id      NULL      -> companies
  listing_id      NULL      -> listings
  property_price  numeric   -- negotiated snapshot
  amount          numeric   -- commission snapshot
  currency        char(3)
```

- The contact is the buyer or tenant. The company is the buyer's organization when the buyer is an entity.
- When both are set, the contact must belong to the company. When the company is null, the contact's employer is irrelevant.
- No "Individuals" company and no buyer/seller role on contacts. An individual view is `company_id IS NULL`.
- `validateDeal` looks up the company only when present; the contact is always looked up and required.
- `listDeals`, `getDeal`, deal search, and global search switch company joins to `leftJoin`; the contact becomes the primary display.
- Existing deals are backfilled/verified before `contact_id SET NOT NULL`. The seed already supplies contacts; a production preflight must fail loudly if nulls remain.

Alternative considered: a sentinel "Individuals" company. Rejected because an individual buyer who works at Acme would fail the contact-company rule unless the employer is overwritten, the contact is duplicated, or the sentinel is special-cased. It also pollutes directory search, company reports, segments, and pickers.

### 4. Commission snapshots and per-record currencies

- Listing: asking `price`, optional `price_period` for rent, `commission_amount`, `currency`.
- Deal: `property_price` and `amount` (commission) are snapshots defaulted from the listing and editable before save.
- `deals.amount` keeps its column name; the UI and spec label it "Commission". This avoids a broad rename while changing the meaning from generic deal value to agency revenue.
- `workspace_settings` holds `default_currency` and `time_zone`. New standalone records use the default; listings and deals store their own currency.
- No FX conversion. Dashboard money metrics return per-currency groups. Price filters and price sorting require a currency.
- Existing deals are migrated with currency `USD` to preserve their current semantics; the workspace default is `USD`/`UTC` until an administrator changes it.

Alternatives considered: one global currency (cannot represent an international portfolio) and converting all records to a reporting currency (needs rates, historical rates, and a policy). Both are out of scope.

### 5. Public images through a persistent storage route

Files live under `IMAGE_STORAGE_DIR` (default `./storage/listing-images`) and are served by an unauthenticated `GET /images/listings/[...key]` route with public cache headers. The URL is public; the CRM does not require a session to fetch a listing photo.

- Do not write runtime uploads into Next.js `public/`. With `output: "standalone"`, runtime files are not reliably served unless the directory is separately mounted, and container replacement loses them.
- File key: `listings/<listingId>/<photoId>.webp`, where `photoId` is a UUID assigned once at upload; `position` in `listing_photos` controls display order. Reordering never renames files.
- Upload: one image per Server Action, validate content and dimensions, re-encode with `sharp`, strip EXIF/GPS, cap the long edge, write the file, insert the row, and append `position`.
- Reorder: validate that every id belongs to the listing, then update positions in a transaction. UI uses dnd-kit plus keyboard move buttons.
- Delete: remove the row and unlink the file. An orphan-cleanup script compares the directory with `listing_photos`, supports a dry run, and reports both orphan files and missing files.
- Deployment: add a persistent volume, `IMAGE_STORAGE_DIR`, `.gitignore` entries, backup documentation, and the AGENTS.md upload policy.
- `sharp` is a new dependency. The existing 8 MB action limit stays; the app enforces a per-image limit and a per-listing photo count.

Alternative considered: the literal `public/images/...` folder. Rejected for standalone deployment reliability, not because the images should be private. The route is still public and cacheable.

### 6. Viewings are a scheduling table, not activities or tasks

```text
listing_viewings
  listing_id, contact_id, agent_id,
  scheduled_at, duration_minutes,
  status: scheduled | completed | cancelled | no_show,
  notes
```

Activities are past-only and tasks are follow-up work; a viewing can be scheduled in the future and has an outcome. Keeping it separate avoids weakening the activity time rule and avoids overloading tasks.

- Store `scheduled_at` in UTC; group calendar days in the workspace time zone.
- Listing detail gets a viewings section: upcoming, past, and a calendar/grid. A global calendar is a later slice.
- Contact detail shows the contact's viewings.
- A viewing does not create a deal or a tenancy. Deals are created separately when an offer exists.

Alternative considered: adding a `scheduled_at`/`status` to activities. Rejected because the activity timeline is a historical record and its future-time rule is a deliberate invariant.

### 7. Extend the fixed activity/task link set with listings

Add `listing_id` to `activities` and `tasks`, add the foreign keys and indexes, and recreate both check constraints to include listing. The shared layers change together:

- `activitySchema`/`taskSchema` link fields and the "at least one" refinements.
- `taskListParamsSchema.recordType`.
- `src/actions/engagement.ts` link fields and revalidation paths.
- `activity-form.tsx`, `task-form.tsx`, and `record-engagement.tsx` link types and hidden inputs.
- `timeline.ts` link maps, conditions, label/href resolution, and the `RecordLink` union.
- Listing detail page passes `listingId` to `RecordEngagement`.
- Specs, messages, Greek glossary, unit/integration/E2E tests.

This is a separate task group inside the change because it touches a shared subsystem, but it is required for listing timelines and listing tasks.

### 8. Public API with an explicit allowlist

```text
GET /api/public/v1/listings
GET /api/public/v1/listings/{id}
```

- Route handlers use `runtime = "nodejs"` and do not call `requireUser`.
- The service selects an explicit public projection. It never serializes a full listing row, so adding an internal column cannot leak by accident.
- Public fields: id, reference, title, description, transaction, property type, price/currency/period, address, core property facts, grouped features, ordered photos, listed/updated timestamps.
- Never public: seller contact, agent/user records, commission, internal notes, deactivation metadata, activities, tasks, or other CRM records.
- Query validation with Zod. Price filters and price sorting require `currency`; missing currency is a 400.
- Responses use `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`, `Access-Control-Allow-Origin: *` for GET, an `OPTIONS` handler, and a stable `{ error: { code, message } }` shape.
- A small in-memory fixed-window rate limiter guards the public read path. Client identifiers are hashed and bounded before they enter the bucket map; the deployment proxy must overwrite `X-Forwarded-For` rather than append to it. A reverse proxy can replace the limiter; the route still returns a retry hint when the local limit is hit.
- Photo URLs are absolute using the configured public app URL.
- The endpoint is versioned in the path and documented in `docs/public-api.md`.
- Security tests assert that seller, agent, commission, and internal fields never appear.

Alternative considered: an API key. Rejected because the requirement is a public listing feed; an authenticated API would not serve the separate public site.

### 9. Active/Inactive listing status without automatic transitions

`listing_status` is `active | inactive`; `deactivated_at` records the time and is cleared on restore. Winning a deal does not silently change the listing. This keeps status explicit and avoids surprising multi-deal behavior. Sold/rented reporting comes from won deals; a future deactivation-reason field can add withdrawn/expired reporting if needed.

Alternative considered: a richer status enum (`under_offer`, `sold`, `rented`, `withdrawn`, `expired`). Rejected for this change because the user explicitly chose Active/Inactive; the dashboard uses deals for closed outcomes.

### 10. Workspace settings table and formatting boundaries

A singleton `workspace_settings` row holds `default_currency` and `time_zone`. Administrators edit it from a settings page. The setup/first-run path seeds `USD` and `UTC`; a Greek deployment can change both.

- `formatCurrency(value, locale, currency)` replaces the USD-only helper. Call sites pass the record currency or the workspace default.
- `formatDate`/`formatDateTime` take a `timeZone`; server rendering uses the workspace zone. `LocalTime` receives the workspace zone so client timestamps match.
- Storage and SLA calculations remain UTC. The SLA spec is unchanged.
- `Intl` validates currency and time-zone identifiers before saving.
- Dashboards return per-currency groups; components render one row/series per currency.

Alternative considered: environment variables. Rejected because the spec requires administrators to set the values; a table plus a small settings form is the durable path.

### 11. Listing overview and main dashboard split

The listings module owns an overview tab (`/listings/dashboard`) with inventory health. The main `/dashboard` gets a compact listings section (active, under-contract-by-deal if available, upcoming viewings) plus a link. This avoids a second home page while keeping listings visible.

- `/listings` remains the inventory list.
- `/listings/dashboard` is the module overview.
- The sidebar gets one Listings item; nested routes keep it active.
- `getListingsDashboard()` returns per-currency money and inventory counts; `getSalesDashboard()` returns per-currency commission groups.

## Risks / Trade-offs

- **Cross-currency totals** → money metrics are typed as per-currency groups, price filters require a currency, and tests assert that no single total is produced.
- **Public PII leak** → explicit allowlisted projection, security tests for seller/agent/commission fields, and a security review before merge.
- **Standalone image serving** → public route over a persistent storage directory, Docker volume, backup and orphan-cleanup documentation.
- **Contact NOT NULL migration** → preflight query for null contacts; fail the migration with a report rather than inventing a placeholder. The seed already supplies contacts.
- **Timeline check-constraint migration** → drop and recreate both checks in the same migration that adds `listing_id`; integration tests cover linking, unlinking, and timeline queries.
- **Feature taxonomy translation volume** → grouped catalog, progressive disclosure in the form, translator review, and glossary entries; the long tail is not shown by default.
- **JSONB filter performance** → GIN index, typed hot columns, and a documented fallback to a derived index table if facet queries become hot.
- **Public API abuse** → local rate limiting, cache headers, bounded page sizes, and reverse-proxy guidance.
- **Greek terminology** → commission, seller/landlord, viewing, and feature group terms go through the translator and glossary before merge.
- **Image privacy** → public URLs are unauthenticated by design; the UI does not link inactive listings, and EXIF/GPS is stripped. Exact-address exposure is a product decision recorded in the spec.

## Migration Plan

1. Preflight existing deals for `contact_id IS NULL`; stop and report if any exist instead of silently backfilling.
2. Add `workspace_settings` and seed the singleton with `USD`/`UTC`.
3. Add listing enums, `listings`, `listing_photos`, and `listing_viewings`, with indexes and the GIN feature index.
4. Add `deals.listing_id`, `deals.property_price`, and `deals.currency`; backfill existing deals to `USD`; alter `contact_id` to `NOT NULL` and `company_id` to nullable.
5. Add `activities.listing_id` and `tasks.listing_id`; recreate both link checks.
6. Deploy `sharp`, the storage directory/volume, and `IMAGE_STORAGE_DIR`.
7. Enable the public API and run the PII projection tests.
8. Update AGENTS.md and the affected specs for currency, public API, and upload policy.

Rollback before release: drop the new tables/columns, restore the old checks, and restore `deals.company_id NOT NULL` after verifying every deal has a company. After listings exist, rollback is destructive; take a database and image-storage backup first.

## Open Questions

- Whether to generate thumbnail derivatives at upload or rely on browser scaling. This is a performance optimization and does not change the API contract.
- The exact public rate-limit threshold and window. The route will expose a constant; operations can tune it without a schema change.
- The orphan-cleanup schedule. The script is part of the change; whether it runs manually or from a host cron is deployment-specific.
