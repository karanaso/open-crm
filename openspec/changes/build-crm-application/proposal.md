# Proposal

## Why

The team has no system of record for customers, sales, support, or marketing; work is scattered across spreadsheets and inboxes. This change establishes a single self-hosted CRM so a small team can manage the full customer lifecycle from one place, starting from an empty repository.

## What Changes

- Scaffold a Next.js (App Router) + TypeScript application with Tailwind CSS and shadcn/ui, backed by PostgreSQL through Drizzle ORM; include Docker Compose for local Postgres, migrations, seed data, linting, and tests.
- Add first-run admin setup, email/password sign-in, invite-only team onboarding, admin/member roles, admin-generated password reset links, and server-side route/action protection. Email delivery is not included; invite and reset links are copied and shared manually.
- Build a shared customer directory of companies and contacts with ownership, tags, related records, search/filtering, and CSV import for companies and contacts.
- Add a unified activity timeline of notes, calls, meetings, and emails (logged manually), plus tasks with assignees, due dates, and links to companies, contacts, deals, tickets, or campaigns.
- Add configurable sales pipelines and stages, deals, a drag-and-drop Kanban board, and deal detail views with timeline, tasks, and win/loss tracking.
- Add a support desk with tickets, priorities, statuses, assignment, requester/company links, public and internal comments, and first-response/resolution tracking with SLA due dates.
- Add marketing segments defined by contact filters, campaigns tied to a segment, audience snapshots, and manual per-contact engagement tracking (targeted, sent, opened, clicked, responded, converted). Campaign sending is out of scope.
- Add a dashboard with sales, support, marketing, and task KPIs, pipeline/ticket/campaign charts, recent activity, and global search across CRM records.
- Add role-based navigation and settings for team management, profile/password, and pipeline configuration.
- Out of scope: real email/calendar sync or sending, file attachments, billing, multi-workspace tenancy, public API/webhooks, mobile apps, advanced custom reporting, audit logs, and real-time collaboration.

## Capabilities

### New Capabilities

- `workspace-access`: First-run workspace setup, sign-in/sign-out, invite-only onboarding, password management, admin/member roles, team administration, and enforcement of authenticated access.
- `crm-directory`: Companies and contacts as shared records, including ownership, tags, relationship links, CSV import, and search/filtering.
- `engagement-timeline`: Notes, manually logged activities, and tasks attached to companies, contacts, deals, tickets, or campaigns.
- `sales-pipeline`: Configurable pipelines and stages, deals, the Kanban board, win/loss lifecycle, and pipeline metrics.
- `support-desk`: Tickets, priorities, statuses, assignment, requester/company links, comments, and response/resolution SLA tracking.
- `marketing-campaigns`: Contact segments, campaigns, audience snapshots, and manual per-contact engagement tracking.
- `crm-dashboard`: Workspace navigation, dashboard KPIs and charts, recent activity, and global search across CRM records.

### Modified Capabilities

None. This is a greenfield project with no existing specs.

## Impact

- New application from scratch; no existing code, data, APIs, or users are affected.
- Adds dependencies: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, postgres, Auth.js, Zod, dnd-kit, papaparse, date-fns, and Recharts; Vitest, Testing Library, and Playwright for tests.
- Adds PostgreSQL schema and migrations for users, invites/reset tokens, companies, contacts, pipelines/stages, deals, activities, tasks, tickets/comments, segments, campaigns, and campaign members.
- Adds app routes for setup, auth, dashboard, companies, contacts, deals, tickets, campaigns, segments, tasks, search, and settings.
- Requires `DATABASE_URL`, `AUTH_SECRET`, and app URL environment variables; local development uses Docker Compose.
- Implementation is phased (foundation, directory, sales, support, marketing, dashboard and hardening) so the app remains runnable after each phase.
- Assumes a single workspace per deployment with all CRM records shared among active team members; no multi-workspace switching or per-record sharing.
