# OpenCRM

A self-hosted CRM for a small team: companies and contacts, a sales pipeline, support tickets, marketing segments and campaigns, follow-up tasks, and a shared activity timeline — all in one workspace.

## Features

- **Customer directory** — companies and contacts with owners, tags, related records, search/filtering, and CSV import.
- **Engagement timeline** — notes, calls, emails, meetings, completed tasks, and automatic stage-change entries on every record.
- **Sales pipeline** — configurable pipelines and stages, a drag-and-drop Kanban board with a keyboard-accessible move menu, win/loss tracking, weighted metrics, and deal detail views.
- **Support desk** — tickets with priorities, assignment, status workflows, replies and internal notes, and SLA tracking for first response and resolution.
- **Marketing** — live contact segments, campaigns, audience snapshots, and manual per-recipient engagement tracking.
- **Dashboard** — sales, support, marketing, and personal task metrics, charts, recent activity, and global search.
- **Workspace access** — first-run admin setup, invite-only onboarding, admin/member roles, deactivation, and one-time password reset links.

## Stack

- Next.js 15 (App Router) + React 19 + strict TypeScript
- PostgreSQL 16 + Drizzle ORM + postgres.js
- Auth.js v5 (Credentials, JWT sessions) + Argon2id
- Tailwind CSS v4 + shadcn/ui and Radix primitives
- dnd-kit, Recharts, Papa Parse
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

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@opencrm.local` | `AdminPassword123!` |
| Member | `member@opencrm.local` | `MemberPassword123!` |

The seed script is idempotent and refuses to run in production.

## Navigation

Authenticated pages share a persistent sidebar: **Dashboard**, **Companies**, **Contacts**, **Deals**, **Tickets**, **Campaigns**, **Tasks**, and **Settings**. Settings shows profile and password to everyone; administrators also see **Team administration** and **Pipelines**. On mobile widths the sidebar becomes a slide-out menu.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `AUTH_SECRET` | Yes | Secret used to sign session tokens (at least 32 characters). |
| `AUTH_URL` | Recommended | Public application URL, e.g. `http://localhost:3000`. |
| `AUTH_TRUST_HOST` | Recommended | Set to `true` when running behind a reverse proxy. |
| `NODE_ENV` | Yes | `development`, `test`, or `production`. |

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
pnpm lint
pnpm typecheck
pnpm build
```

The E2E tests are ordered: the auth spec performs first-run setup and creates the admin used by later specs. They run serially against an isolated database.

## Team operations

- **Invitations** are single-use links valid for 7 days. The link is shown once; there is no email delivery, so copy and share it securely.
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

## Timeline and tasks

- Activities: note, call, email, meeting. Each must link to at least one record and cannot be in the future.
- Authors can edit or delete their own activities; admins can delete any activity.
- Completed tasks appear on record timelines.
- Tasks: title, due date, priority, assignee, and at least one linked record. New tasks cannot be due in the past.
- The task page groups open tasks into overdue, due today, next 7 days, and later; completed tasks are separate.

## Support SLA

Targets are measured in calendar hours from ticket creation (UTC):

| Priority | First response | Resolution |
| --- | --- | --- |
| Urgent | 1 hour | 8 hours |
| High | 4 hours | 24 hours |
| Normal | 8 hours | 48 hours |
| Low | 24 hours | 72 hours |

The first reply by a team member sets the first-response time; internal notes do not. Resolving sets the resolution time; reopening clears it. Changing priority recalculates due times from the original creation time. Internal notes are visible only to administrators and the currently assigned member.

Ticket status transitions:

| From | Allowed next statuses |
| --- | --- |
| Open | In progress, pending, resolved, closed |
| In progress | Pending, in progress, resolved, closed |
| Pending | In progress, pending, resolved, closed |
| Resolved | Open, closed |
| Closed | Open |

## Marketing

- **Segments** evaluate current contact data with AND across fields and OR within a tag list. At least one criterion is required.
- **Activating a campaign** snapshots the matching contacts into recipients and stores the segment name and criteria. Later segment or contact changes do not alter the snapshot.
- Engagement statuses are manual: targeted, sent, opened, clicked, responded, converted. Campaign metrics count current statuses and show response and conversion rates.
- **No messages are sent from the CRM.** Use an external tool for delivery.
- Archived campaigns are read-only.

## Dashboard and search

- Open pipeline count/value and weighted value, current-month wins and win rate, and deals closing in the next 30 days.
- Active support tickets, unassigned and overdue counts, and average first-response/resolution time for tickets resolved in the last 30 days.
- Active campaign count, audience, response rate, and conversions.
- Personal overdue, due-today, and upcoming task counts.
- Global search covers companies, contacts, deals, tickets, and campaigns, capped at five per group. It requires a session.

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
  opencrm
```

The image exposes `/api/health`, which checks database connectivity. Terminate TLS at a reverse proxy and keep the database private. Migrations are forward-only; back up the database before upgrading.

## Project structure

```
src/
  app/
    (auth)/            first-run setup, sign-in, invite, reset
    (app)/             authenticated pages and navigation shell
    api/               Auth.js, health, global search
  actions/             Server Actions (writes)
  components/          UI, shell, timeline, deals, tickets, marketing
  db/                  Drizzle schema, client, seed, default pipeline
  lib/
    auth/              password, tokens, guards, throttling
    services/          domain services and queries
    validation/        Zod schemas
tests/
  unit/                pure logic and component tests
  integration/         real PostgreSQL service tests
  e2e/                 Playwright journeys
```

## Known limitations

- Single workspace per deployment; all active members share CRM data. No multi-tenancy or per-record sharing.
- USD only; no multi-currency, FX, tax, or invoicing.
- No email/calendar integration, campaign delivery, file attachments, public API, webhooks, mobile app, real-time collaboration, custom report builder, or audit log.
- SLA calculations use calendar hours in UTC, not business hours or a workspace timezone.
- Date-only task due dates are evaluated in UTC.
- CSV import runs synchronously; large files may take a few seconds.
- Archived records are retained rather than hard-deleted.
