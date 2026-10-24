# Tasks

## 1. Policy, dependencies, and runtime configuration

- [x] 1.1 Update `AGENTS.md` so money is workspace/record currency rather than USD-only, the public listings API is the only unauthenticated data surface, and uploads are limited to listing photos. Verify with `rg -n "USD|public API|file attachments|upload" AGENTS.md` that no contradictory constraint remains.
- [x] 1.2 Add `sharp` to `package.json`, install it, and confirm the standalone build can import it. Verify with `pnpm install`, `pnpm build`, and a small server-side import check.
- [x] 1.3 Add `IMAGE_STORAGE_DIR` to the environment schema and `.env.example`, ignore the storage directory in `.gitignore`, and add a persistent Docker volume for it. Verify with `pnpm typecheck`, `docker compose config`, and a write/read smoke test in the configured directory.
- [x] 1.4 Document the runtime requirement that the storage directory is writable and backed up, including standalone/Docker behavior. Verify the documented path and volume match the implementation.

## 2. Database schema and migrations

- [x] 2.1 Add the singleton `workspace_settings` table with `default_currency` and `time_zone`, and seed `USD`/`UTC` idempotently. Verify `pnpm db:generate`, `pnpm db:migrate`, and an integration test that reads the singleton.
- [x] 2.2 Add listing enums (`listing_transaction`, `listing_status`, `rent_period`, `property_type`, `viewing_status`, optional energy class), the `listings` table, its indexes, and the `features` GIN index. Verify with generated SQL inspection, `pnpm db:migrate`, and a GIN containment query in an integration test.
- [x] 2.3 Add `listing_photos` and `listing_viewings` with foreign keys, status/position constraints, and query indexes. Verify migration and integration tests for cascade/restrict behavior and position ordering.
- [x] 2.4 Add `deals.listing_id`, `deals.property_price`, and `deals.currency`; backfill existing deals to `USD`; alter `contact_id` to `NOT NULL` and `company_id` to nullable. Run the null-contact preflight first; verify the migration and constraint behavior on a copy of the test database.
- [x] 2.5 Add `activities.listing_id` and `tasks.listing_id`, their indexes, and recreate both link checks to include listings. Verify migration and integration tests for linked and rejected records.
- [x] 2.6 Extend the seed with sale and rent listings, seller contacts, photos, viewings, and individual-buyer deals so E2E and dashboard tests have deterministic data. Verify `pnpm db:seed` twice and confirm idempotency.
- [x] 2.7 Update the integration database reset/schema setup and document the rollback path: drop new tables/columns, restore old checks, and restore `company_id NOT NULL` only after verifying every deal has a company. Verify a clean reset and a documented backup/rollback rehearsal.

## 3. Catalog, formatting, and validation contracts

- [x] 3.1 Implement the listing feature catalog with every supplied group and key, stable keys, label keys, and group ordering. Add English and Greek label entries and verify with a completeness unit test plus `pnpm i18n:check`.
- [x] 3.2 Add Zod schemas for listing create/update, status changes, feature objects, and list filters, including currency, rent-period, price, commission, and reference rules. Verify unit tests for valid and invalid inputs.
- [x] 3.3 Add Zod schemas for photo metadata/uploads, viewing schedules and statuses, and workspace currency/time-zone settings. Verify unit tests for each rejection path.
- [x] 3.4 Update the deal schema so contact is required, company is optional, listing/property price/currency are supported, and commission uses the deal currency. Verify unit tests for individual buyers, company-contact mismatch, and invalid money.
- [x] 3.5 Update activity and task schemas to include `listingId` in the link set and the "at least one link" refinement, and add listing to the task record-type filter. Verify unit tests for listing-only, multi-link, and no-link submissions.

## 4. Listing services, media, and viewings

- [x] 4.1 Implement listing create/update/detail/list/search/filter/status/seller/agent services, including inactive exclusion from default surfaces and explicit status changes. Verify integration tests for CRUD, filters, status transitions, and listing/deal isolation.
- [x] 4.2 Implement the listings overview aggregates: active sale/rent counts, new listings, upcoming viewings, aging inventory, and asking value/rent roll grouped by currency. Verify integration tests with multiple currencies.
- [x] 4.3 Implement image storage: content validation, `sharp` re-encoding, EXIF/GPS stripping, stable photo-identity keys, and a public image route with cache headers and traversal protection. Verify upload, metadata, and header integration tests.
- [x] 4.4 Implement photo upload, reorder, and delete services/actions, plus the orphan-cleanup script with dry-run and missing-file reporting. Verify action tests, reorder persistence, deletion, and a dry-run against a fixture directory.
- [x] 4.5 Implement viewing create/update/list services with past and future scheduling, statuses, agent assignment, and listing/contact views. Verify integration tests for multiple viewings per contact and listing, and confirm no tenancy records are created.
- [x] 4.6 Document image storage layout, upload limits, EXIF stripping, backup, and orphan cleanup in `docs/`. Verify every documented command against a test storage directory.

## 5. Cross-module services and reporting

- [x] 5.1 Update deal services for required contact, optional company, listing lookup, price/commission snapshots, and currency defaults. Verify integration tests for individual buyers, company buyers, listing-linked deals, and archived companies.
- [x] 5.2 Update deal list/detail/search joins to `leftJoin` companies and match contact names, and make pipeline metrics return per-currency groups without cross-currency sums. Verify integration tests with EUR/USD deals and individual buyers.
- [x] 5.3 Update directory services so company detail shows seller listings and contact detail shows selling listings, buying deals, and viewings. Verify integration tests for a contact who is both buyer and seller and for archived sellers.
- [x] 5.4 Extend timeline and task services with listing links, label/href resolution, listing timeline queries, and listing record-type filters. Verify integration tests for listing activities, listing tasks, and unlink behavior.
- [x] 5.5 Add listings to global search and extend dashboard data with per-currency sales metrics and the listings overview. Verify integration tests for listing search, per-currency aggregates, and empty states.
- [x] 5.6 Add `formatCurrency(value, locale, currency)` and time-zone-aware date formatting; update `LocalTime` to render in the workspace time zone. Verify unit tests for EUR/USD formatting, time-zone conversion, and unchanged stored values.

## 6. Server Actions

- [x] 6.1 Add listing create, update, deactivate, and restore actions with server-side validation and revalidation. Verify action tests for success, invalid input, inactive seller/agent, and permission behavior.
- [x] 6.2 Add photo upload, reorder, and delete actions with listing ownership checks, upload limits, and file cleanup. Verify action tests for valid uploads, rejected files, cross-listing ids, and deletion.
- [x] 6.3 Add viewing schedule/update actions with agent and contact validation. Verify action tests for future/past schedules, invalid statuses, and inactive agents.
- [x] 6.4 Add the administrator-only workspace settings action for default currency and time zone. Verify member requests are rejected and invalid identifiers are not saved.
- [x] 6.5 Update deal, engagement, and task actions for the new deal rules and listing link. Verify action tests for contact-only deals, listing links, and link removal.

## 7. Public listings API

- [x] 7.1 Implement the explicit public projection service and the versioned collection/detail route handlers without session checks. Verify integration tests for active-only results, detail lookup, and inactive/missing not-found behavior.
- [x] 7.2 Add query validation, pagination, filters, sorting, and the currency requirement for price filters/sorting. Verify integration tests for each filter, page bounds, and missing-currency rejection.
- [x] 7.3 Add cache headers, CORS, `OPTIONS`, stable error responses, and the per-client rate limiter. Verify header assertions, a 429 response, and generic 500 responses without internal details.
- [x] 7.4 Write `docs/public-api.md` with the endpoint contract, field list, filters, errors, caching, and rate limits; verify the examples against a seeded test database.
- [x] 7.5 Add security integration tests asserting that seller, agent, commission, activity, task, and internal fields never appear in public responses. Verify the full public API test suite passes and record the security-review result.

## 8. Listings UI

- [x] 8.1 Add Listings to `NAV_ITEMS` and the sidebar/mobile icons, plus the listing message namespace. Verify the active state on nested listing routes and `pnpm i18n:check`.
- [x] 8.2 Build the listing list with search, transaction/status/type/city/bedroom/feature/price-currency filters, sorting, pagination, empty states, and URL-preserved filters. Verify component tests and the URL-state E2E journey.
- [x] 8.3 Build the create/edit listing form with core facts, sale/rent pricing, currency, commission, seller, agent, status, and the grouped feature picker with progressive disclosure. Verify validation, keyboard access, and axe checks.
- [x] 8.4 Build the listing detail page with photos, seller/agent links, features, linked deals, viewings, and the combined timeline/tasks. Verify detail E2E and archive/inactive indicators.
- [x] 8.5 Build the photo manager with upload progress, ordered grid, drag-and-drop plus keyboard reordering, delete confirmation, and public image URLs. Verify reorder persistence, accessible controls, and a photo-upload E2E.
- [x] 8.6 Build the listing viewings section: upcoming/past lists, schedule dialog, status updates, and listing-scoped calendar/grid in the workspace time zone. Verify time-zone rendering, multiple viewings, and a scheduling E2E.
- [x] 8.7 Build the `/listings/dashboard` overview tab with inventory, new, viewings, aging, and per-currency asking value/rent roll, linking each metric to a filtered view. Verify component tests and the per-currency E2E.
- [x] 8.8 Run the listings module E2E journey and accessibility checks, including inactive listing exclusion, photo reorder, viewing schedule, and listing timeline. Verify with `pnpm test:e2e` and the axe assertions.

## 9. Existing module UI integration

- [x] 9.1 Update the deal form, detail, list, and Kanban cards for required contact, optional company, listing link, property price, commission labels, and per-currency formatting. Verify deal E2E for individual and company buyers.
- [x] 9.2 Update company and contact detail pages with selling listings, buying deals, viewings, and archived-seller indicators. Verify directory E2E and link navigation.
- [x] 9.3 Update global search with the listings group and update dashboard tiles/charts for per-currency commissions and the compact listings section. Verify search, chart, and currency E2E/component tests.
- [x] 9.4 Add the administrator workspace settings page for default currency and time zone. Verify member denial, validation errors, and immediate formatting changes.
- [x] 9.5 Add or update English and Greek messages for deals, dashboard, directory, currency, and time zones, then run `pnpm i18n:check`. Verify no raw keys or USD-only labels remain in the changed surfaces.
- [x] 9.6 Run the existing module regression suite and accessibility checks for deals, directory, dashboard, search, and settings. Verify with `pnpm test`, `pnpm test:e2e`, and axe assertions.

## 10. Integration verification and release readiness

- [x] 10.1 Complete the Greek glossary for listing, commission, seller/landlord, viewing, feature groups, property types, and listing statuses; run the translator review and `pnpm i18n:check`.
- [x] 10.2 Update `README.md`, `AGENTS.md`, image-storage docs, and public API docs for the new module, currency/time-zone behavior, upload policy, and public endpoint. Verify links and documented commands.
- [x] 10.3 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm i18n:check`, and `pnpm build`; fix all failures before merge.
- [x] 10.4 Perform the security review for the public API, upload path, image serving, and auth exception; verify no PII leak, path traversal, or unauthenticated write is possible.
- [x] 10.5 Manual smoke test with seeded data: create a sale and rent listing, upload/reorder/delete a photo, schedule and complete a viewing, create an individual-buyer deal, fetch the public API, deactivate a listing, and confirm default lists/search exclude it.
- [x] 10.6 Check `git status` and `git diff --check`; confirm no secrets, uploads, build output, `tsconfig.tsbuildinfo`, or unrelated files are staged.

## Workflow follow-up

- Archive the change after the review and verification requirements are satisfied.
- Verify the archived specs and change contents.
