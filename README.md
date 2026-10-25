# OpenCRM

A self-hosted CRM for a small team: companies and contacts, real estate listings for sale and rent, a sales pipeline, support tickets, marketing segments and campaigns, follow-up tasks, and a shared activity timeline — all in one workspace.

## Features

- **Customer directory** — companies and contacts with owners, tags, related records, search/filtering, and CSV import. A contact can be a buyer and a seller at the same time; roles live on the relationship, not the person.
- **Listings** — sale and rent properties with asking price and monthly rent, one-time commission, per-record currency, grouped property features, seller and agent links, public photos, scheduled viewings, filters, and a listings overview.
- **Engagement timeline** — notes, calls, emails, meetings, completed tasks, automatic stage-change entries, and listing activities on every record.
- **Sales pipeline** — configurable pipelines and stages, a drag-and-drop Kanban board with a keyboard-accessible move menu, win/loss tracking, commission metrics, and deal detail views. Deals always have a buyer/tenant contact; the company is optional for individual buyers.
- **Support desk** — tickets with priorities, assignment, status workflows, replies and internal notes, and SLA tracking for first response and resolution.
- **Marketing** — live contact segments, campaigns, audience snapshots, and manual per-recipient engagement tracking.
- **Dashboard** — sales commission, support, marketing, listings, and personal task metrics, per-currency charts, recent activity, and global search.
- **Workspace access** — first-run admin setup, invite-only onboarding, admin/member roles, deactivation, and one-time password reset links.
- **Public listing feed** — an unauthenticated, read-only JSON API for active listings, with an explicit privacy boundary and no seller, agent, or commission data.
- **Localization** — English and Greek interfaces with a profile language preference, localized validation and errors, per-record currency formatting, and a workspace display time zone.

## Stack

- Next.js 15 (App Router) + React 19 + strict TypeScript
- PostgreSQL 16 + Drizzle ORM + postgres.js
- Auth.js v5 (Credentials, JWT sessions) + Argon2id
- Tailwind CSS v4 + shadcn/ui and Radix primitives
- dnd-kit, Recharts, Papa Parse
- next-intl (English and Greek catalogs)
- Vitest + Testing Library + Playwright

## Quick start

Prerequisites: Node.js 22+, pnpm 11+, and PostgreSQL 16 (or Docker/Podman).

```bash
cp .env.example .env.local
# Replace AUTH_SECRET with a random 32-byte secret:
openssl rand -hex 32
```

Start PostgreSQL with Docker Compose:

```bash
docker compose up -d db
```

If Docker is unavailable, any PostgreSQL 16 instance works. With Podman:

```bash
podman run -d --name crm-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=opencode_crm \
  -p 5432:5432 \
  docker.io/library/postgres:16-alpine
```

Then install, migrate, and run:

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Open `http://localhost:3000` and complete first-run setup. The first account becomes the workspace administrator. Add teammates from **Settings → Team** and share invitation links out of band.

### Demo data (optional)

```bash
NODE_ENV=development pnpm db:seed
```

Demo accounts:

| Role   | Email                  | Password             |
| ------ | ---------------------- | -------------------- |
| Admin  | `admin@opencrm.local`  | `AdminPassword123!`  |
| Member | `member@opencrm.local` | `MemberPassword123!` |

The seed script is idempotent and refuses to run in production.

## Navigation

Authenticated pages share a persistent sidebar: **Dashboard**, **Companies**, **Contacts**, **Listings**, **Deals**, **Tickets**, **Campaigns**, **Messages**, **Tasks**, and **Settings**. Listings has an inventory view and a module overview. Settings shows profile and password to everyone; administrators also see **Team administration**, **Pipelines**, and **Workspace defaults** (currency and display time zone). On mobile widths the sidebar becomes a slide-out menu.

## Environment variables

| Variable            | Required    | Purpose                                                                                                                       |
| ------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | Yes         | PostgreSQL connection string.                                                                                                 |
| `AUTH_SECRET`       | Yes         | Secret used to sign session tokens (at least 32 characters).                                                                  |
| `AUTH_URL`          | Recommended | Public application URL, e.g. `http://localhost:3000`.                                                                         |
| `AUTH_TRUST_HOST`   | Recommended | Set to `true` when running behind a reverse proxy.                                                                            |
| `NODE_ENV`          | Yes         | `development`, `test`, or `production`.                                                                                       |
| `IMAGE_STORAGE_DIR` | No          | Writable directory for listing photos. Defaults to `./storage/listing-images`; in Docker it is `/app/storage/listing-images`. |
| `SMTP_HOST`         | No          | SMTP server host. Messaging stays draft-only when unset.                                                                      |
| `SMTP_PORT`         | No          | SMTP port. Defaults to `587`.                                                                                                 |
| `SMTP_SECURE`       | No          | Set to `true` for implicit TLS, usually port 465. Defaults to `false` (STARTTLS).                                             |
| `SMTP_USER`         | No          | SMTP username; requires `SMTP_PASSWORD`.                                                                                      |
| `SMTP_PASSWORD`     | No          | SMTP password; requires `SMTP_USER`. Never logged or sent to the browser.                                                     |
| `SMTP_ALLOW_PLAINTEXT` | No       | Set to `true` to allow SMTP AUTH without STARTTLS. Use only for a trusted local relay.                                        |
| `MESSAGING_FROM`    | With SMTP   | Sender identity, e.g. `OpenCRM <crm@example.com>`. Required before any message can be sent.                                   |
| `MESSAGING_MAX_RECIPIENTS` | No    | Maximum eligible recipients per message. Defaults to `100`; values above `1000` are clamped.                                  |
| `MESSAGING_TRANSPORT` | No        | Set to `fake` to bypass delivery in local demos and tests. Ignored when `NODE_ENV=production`.                                 |

## Database and migrations

```bash
pnpm db:generate   # generate a migration after editing src/db/schema.ts
pnpm db:migrate    # apply migrations
pnpm db:studio     # inspect data with Drizzle Studio
```

The initial migration creates the schema, enables `pg_trgm`, adds search indexes, and seeds the default **Sales Pipeline** (Lead, Qualified, Proposal, Negotiation, Won, Lost).

### Test databases

The integration suite expects a separate database:

```bash
createdb -h localhost -U postgres opencode_crm_test
```

The E2E suite creates and migrates `opencode_crm_e2e` automatically.

## Testing

```bash
pnpm test                 # unit and component tests
pnpm test:integration     # integration tests against opencode_crm_test
pnpm exec playwright install chromium
pnpm test:e2e             # resets the E2E database, starts a test server on :3100
pnpm i18n:check           # English/Greek key, empty-value, and placeholder parity
pnpm lint
pnpm typecheck
pnpm build
```

The E2E tests are ordered: the auth spec performs first-run setup and creates the admin used by later specs. They run serially against an isolated database.

## Localization

- English is the default; Greek is available from **Settings → Profile** and from the language control on setup, sign-in, invitation, and reset pages.
- The preference is stored on `users.locale` and mirrored in the `opencrm_locale` cookie. URLs do not contain a locale.
- UI strings live in `messages/en.json` (source) and `messages/el.json`; keys and placeholders must match. Run `pnpm i18n:check` after changing either file.
- Server Actions and services return locale-independent message descriptors. Forms and pages translate them; services never return English display sentences.
- Dates, numbers, currency amounts, and durations use `src/i18n/format.ts` and the active locale. Amounts use the workspace default or the record's own currency; there is no FX conversion. Display dates use the workspace time zone while storage and UTC calendar-hour SLA rules do not change.
- Do not translate user data: company and contact names, notes, tags, pipeline stage names, campaign copy, activity subjects, or task titles. Stored enum values stay in English; only their display labels are localized through `src/i18n/labels.ts`.
- Greek terminology and style rules live in `docs/i18n/glossary.md` and `docs/i18n/style-guide.md`. Translation is local only; do not send application strings to an external service.

## Team operations

- **Invitations** are single-use links valid for 7 days. The link is shown once; there is no email delivery, so copy and share it securely.
- **Password changes** sign out the current session and all other sessions; sign in again with the new password.
- **Password resets** are admin-issued links valid for 24 hours. Redeeming a link signs out other sessions.
- **Deactivation** blocks access immediately. The last active administrator cannot be deactivated or demoted.
- **Roles**: administrators manage the team, invitations, resets, and pipeline configuration. Members can manage all CRM records.

## CSV import

Go to **Companies → Import CSV** or **Contacts → Import CSV**. Limits are 5 MB and 5,000 data rows.

### Companies

```csv
Company Name,Domain,Industry,Employee Count,Phone,Website,City,Region,Country
Acme Software,acme.com,Software,240,+1 415 555 0101,https://acme.com,San Francisco,CA,United States
```

Required mapping: company name. Domains are normalized (lowercase, no protocol or `www.`). Duplicate domains are skipped and counted.

### Contacts

```csv
First Name,Last Name,Email,Phone,Job Title,Company Domain
Jordan,Lee,jordan.lee@acme.com,+1 415 555 0121,VP Operations,acme.com
```

Required mapping: first name, last name, email. For company association, map **Company Domain** or **Company Name**. Import companies first; contacts whose company cannot be matched are skipped with a row-level reason. Duplicate emails are skipped.

Invalid rows are reported with row numbers; valid rows still import.

## Sales pipeline

- Admins configure pipelines and stages at **Settings → Pipelines**.
- Each pipeline must keep at least one open, won, and lost stage.
- Stages or pipelines containing deals cannot be removed or archived; move the deals first.
- The default pipeline cannot be archived. Exactly one pipeline is the default and is preselected for new deals.
- Drag a deal between stages, or use the card's move menu for keyboard access.
- Moving to **Lost** requires a reason. Moving back to an open stage clears the close time and lost reason.
- Stage changes create timeline entries and are protected against stale concurrent edits.
- A deal always has a buyer or tenant contact. A company is optional, so an individual buyer needs no fake company record.
- A deal can link to a listing and stores a snapshot of the negotiated property price and the agency's one-time commission. The commission, not the property price, is the pipeline value.
- Money is grouped by currency. There is no FX conversion, and dashboard or pipeline totals are never summed across currencies.

## Real estate listings

- Create sale and rent listings with a unique reference, asking price (monthly rent for rentals), one-time commission, currency, property type, address, core facts, energy class, seller contact, and responsible agent.
- Sale and rent are one record type with a transaction discriminator. Rent listings must define a monthly period; no lease, rent collection, or maintenance records are created.
- Property features are grouped into 18 categories and shown progressively. Core numeric facts (bedrooms, bathrooms, size, lot size, year, floors, parking) remain typed for filters and sorting.
- Listings are **Active** or **Inactive**. Inactive listings leave default lists and the public API but remain reachable by signed-in members. Listings are never hard-deleted.
- A contact can be the seller on one listing and the buyer on a deal for another; no buyer/seller role is stored on the contact.
- The listings overview shows active sale/rent inventory, new listings, upcoming viewings, aging inventory, and asking sale value and monthly rent roll per currency.

## Listing photos and viewings

- Listing photos are public files served from the unauthenticated `/images/listings/...` route. Uploads are limited to listing photos; no other record type accepts attachments.
- Images are re-encoded to WebP, capped at 2000 px on the long edge, and stripped of EXIF/GPS. JPEG, PNG, and WebP are accepted up to 8 MB; a listing holds at most 20 photos.
- Display order is stored separately from the stable file identity, so reordering never renames files. Use the photo manager or its keyboard controls.
- Viewings are scheduled per listing and contact with an agent, duration, status, and notes. Past and future viewings are supported; statuses are scheduled, completed, cancelled, and no_show. There is no tenancy management.
- See `docs/listing-images.md` for storage layout, backup, and orphan cleanup.

## Public listings API

`GET /api/public/v1/listings` and `GET /api/public/v1/listings/{id}` expose active listings without a session. The API is read-only, versioned, and returns only allowlisted public fields and ordered photo URLs. It never exposes seller or agent records, commission, internal notes, activities, tasks, or other CRM data.

Price filters and price sorting require a currency; there is no cross-currency comparison. Responses are public-cacheable and rate-limited. See `docs/public-api.md` for the field list, filters, errors, caching, and examples.

## Timeline and tasks

- Activities: note, call, email, meeting. Each must link to at least one record and cannot be in the future.
- Authors can edit or delete their own activities; admins can delete any activity.
- Completed tasks appear on record timelines.
- Tasks: title, due date, priority, assignee, and at least one linked record. New tasks cannot be due in the past.
- The task page groups open tasks into overdue, due today, next 7 days, and later; completed tasks are separate.

## Support SLA

Targets are measured in calendar hours from ticket creation (UTC):

| Priority | First response | Resolution |
| -------- | -------------- | ---------- |
| Urgent   | 1 hour         | 8 hours    |
| High     | 4 hours        | 24 hours   |
| Normal   | 8 hours        | 48 hours   |
| Low      | 24 hours       | 72 hours   |

The first reply by a team member sets the first-response time; internal notes do not. Resolving sets the resolution time; reopening clears it. Changing priority recalculates due times from the original creation time. Internal notes are visible only to administrators and the currently assigned member.

Ticket status transitions:

| From        | Allowed next statuses                  |
| ----------- | -------------------------------------- |
| Open        | In progress, pending, resolved, closed |
| In progress | Pending, in progress, resolved, closed |
| Pending     | In progress, pending, resolved, closed |
| Resolved    | Open, closed                           |
| Closed      | Open                                   |

## Marketing

- **Segments** evaluate current contact data with AND across fields and OR within a tag list. At least one criterion is required.
- **Activating a campaign** snapshots the matching contacts into recipients and stores the segment name and criteria. Later segment or contact changes do not alter the snapshot.
- Engagement statuses are manual: targeted, sent, opened, clicked, responded, converted. Campaign metrics count current statuses and show response and conversion rates.
- **Campaigns never send messages.** Activating a campaign only creates recipients; delivery belongs to Messaging.
- Archived campaigns are read-only.

## Messaging

- Compose plain-text email to a static recipient group or a segment. Sending freezes the audience and keeps the group or segment name and criteria as a snapshot.
- Merge fields `{{firstName}}`, `{{lastName}}`, and `{{company}}` are replaced per recipient. Any other placeholder is rejected when saving.
- Contacts marked do-not-email, archived contacts, and contacts without an email address are recorded as skipped with a reason rather than silently dropped.
- Each recipient records `queued`, `sent`, `failed`, or `skipped`. "Sent" means the SMTP server accepted the message; the CRM cannot observe delivery, bounces, or opens.
- Retry re-attempts only queued and failed recipients. Sent and skipped recipients are never retried.
- A message can be cancelled while a send is interrupted; remaining queued recipients become skipped.
- A single send is capped at `MESSAGING_MAX_RECIPIENTS` (default 100) eligible recipients.
- Sending is synchronous. A crash mid-send leaves the message in `sending` with queued recipients available for retry.
- Deliverability is the operator's responsibility: configure SPF, DKIM, and DMARC for the sender domain and use a From address the SMTP server may send as.

## Dashboard and search

- Open commission count/value and weighted value, current-month won commission and win rate, and deals closing in the next 30 days. Money values are shown per currency.
- Active support tickets, unassigned and overdue counts, and average first-response/resolution time for tickets resolved in the last 30 days.
- Active campaign count, audience, response rate, and conversions.
- Listing inventory, sale/rent split, upcoming viewings, aging inventory, and per-currency asking value/rent roll.
- Personal overdue, due-today, and upcoming task counts.
- Global search covers companies, contacts, listings, deals, tickets, and campaigns, capped at five per group. It requires a session; the public listings API is the only unauthenticated data surface.

## Deployment

Build the standalone image:

```bash
docker build -t opencrm .
```

Run migrations before starting the app, using the repository or a migration job:

```bash
DATABASE_URL=postgres://... pnpm db:migrate
```

Run the container with production environment variables:

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://user:pass@db:5432/opencode_crm \
  -e AUTH_SECRET=... \
  -e AUTH_URL=https://crm.example.com \
  -e AUTH_TRUST_HOST=true \
  -e IMAGE_STORAGE_DIR=/app/storage/listing-images \
  -v opencrm_images:/app/storage/listing-images \
  opencrm
```

The listing-image directory must be writable by the `nextjs` user and included in backups. In Docker Compose the `crm_images` volume is mounted automatically.

To enable email delivery, also pass `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, optional `SMTP_USER` and `SMTP_PASSWORD`, `MESSAGING_FROM`, and optionally `MESSAGING_MAX_RECIPIENTS`. Without them the Messaging pages still work, but sending is rejected with a configuration error. Configure SPF, DKIM, and DMARC for the sender domain before sending to real recipients.

The image exposes `/api/health`, which checks database connectivity. Terminate TLS at a reverse proxy and keep the database private. Migrations are forward-only; back up the database before upgrading.

## Project structure

```
src/
  app/
    (auth)/            first-run setup, sign-in, invite, reset
    (app)/             authenticated pages and navigation shell
    api/               Auth.js, health, global search, public listings
    images/            public listing-photo route
  actions/             Server Actions (writes)
  components/          UI, shell, timeline, listings, deals, tickets, marketing
  db/                  Drizzle schema, client, seed, default pipeline, workspace settings
  lib/
    auth/              password, tokens, guards, throttling
    services/          domain services and queries
    validation/        Zod schemas
    messaging/         email transport, merge-field rendering, delivery config
    listing-features.ts grouped listing feature catalog
tests/
  unit/                pure logic and component tests
  integration/         real PostgreSQL service tests
  e2e/                 Playwright journeys
```

## Known limitations

- Single workspace per deployment; all active members share CRM data. No multi-tenancy or per-record sharing.
- Per-record currency is supported, but there is no FX conversion, converted reporting total, tax, or invoicing.
- No rental management (leases, rent collection, maintenance), public HTML listing pages, or co-owner seller table.
- File uploads are limited to listing photos; there are no documents, contracts, or other attachments.
- The public API is read-only and limited to active listings. There is no public write, webhook, or API key surface.
- No calendar integration, SMS, HTML email or templates, scheduling, attachments, bounce webhooks, or unsubscribe pages; email delivery is limited to plain-text relationship email. No mobile app, real-time collaboration, custom report builder, or audit log.
- SLA calculations use calendar hours in UTC, not business hours or a workspace timezone.
- Date-only task due dates are evaluated in UTC; listing and viewing display uses the workspace time zone.
- CSV import runs synchronously; large files may take a few seconds.
- Archived records are retained rather than hard-deleted.
- English and Greek are the supported interface languages. There is no URL-prefixed locale, right-to-left layout, or additional language catalog.
