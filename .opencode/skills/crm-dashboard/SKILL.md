---
name: crm-dashboard
description: Module context for the OpenCRM dashboard and global search. Use when a task touches dashboard metrics, charts, recent activity, global search, or the navigation shell.
---

# CRM Dashboard

Load this skill with `backend`, `frontend`, or `qa` when the task touches dashboard aggregates, charts, global search, or the authenticated shell.

## Module map

- Spec: `openspec/specs/crm-dashboard/spec.md`
- Routes:
  - `src/app/(app)/dashboard/page.tsx`
  - `src/app/api/search/route.ts`
- Components: `src/components/dashboard/**`, `src/components/search/**`, `src/components/layout/**`
- Services: `src/lib/services/dashboard.ts`, `src/lib/services/search.ts`
- Schema: aggregates across `deals`, `tickets`, `campaigns`, `campaign_recipients`, `tasks`, and `activities`
- Tests: `tests/integration/dashboard.test.ts`, `tests/e2e/06-dashboard-search.spec.ts`, `tests/e2e/07-shell.mobile.spec.ts`, `tests/unit/metrics.test.ts`, `tests/unit/search-params.test.ts`

## Invariants

1. Sales metrics: open deal count/value, weighted open value, current-month won count/value, current-month win rate, and open deals closing within 30 days. Win rate is won / (won + lost) for the current month; zero when no deals closed.
2. Support metrics: active tickets (open, in progress, pending), unassigned, overdue, and 30-day average first-response and resolution times. Averages are zero when no tickets resolved in the period.
3. Marketing metrics: active campaigns, active-campaign audience, response rate, and conversions. Response rate is (responded + converted) / audience; zero for an empty audience.
4. Task metrics are personal to the signed-in user: overdue, due today, and due within seven days. Other users' tasks are excluded.
5. Charts use the same data scope as their metric cards: pipeline open value by stage, ticket counts by status, and active-campaign recipients by engagement status.
6. Recent activity shows the 10 newest entries with type, subject, author, timestamp, and links to every linked record.
7. Global search requires at least two characters, searches companies, contacts, deals, tickets, and campaigns, groups results by type, caps each group at five, and links to the record. A one-character query returns nothing.
8. The shell lists Dashboard, Companies, Contacts, Deals, Tickets, Campaigns, Tasks, and Settings, indicates the current section, hides team/pipeline administration from members, and collapses to a mobile menu.
9. Dashboard and search are read-only. Do not add mutations here; link to the owning module.

## Workflow

1. Read the dashboard spec and the relevant aggregate query.
2. Keep metric definitions in services; charts render returned data.
3. Add integration coverage with mixed and empty data; E2E coverage for search grouping and mobile navigation.
4. Check per-user task scoping and admin-only links in every change.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:integration tests/integration/dashboard.test.ts`
- `pnpm test:e2e tests/e2e/06-dashboard-search.spec.ts tests/e2e/07-shell.mobile.spec.ts`
