---
name: crm-marketing
description: Module context for OpenCRM marketing. Use when a task touches contact segments, campaign lifecycle, audience snapshots, budget, or manual per-recipient engagement tracking.
---

# CRM Marketing

Load this skill with `backend`, `frontend`, or `qa` when the task touches segments, campaigns, audiences, or engagement.

## Module map

- Spec: `openspec/specs/marketing-campaigns/spec.md`
- Routes:
  - `src/app/(app)/segments/**`
  - `src/app/(app)/campaigns/**`
- Components: `src/components/marketing/**`
- Server Actions: `src/actions/marketing.ts`
- Services: `src/lib/services/marketing.ts`
- Validation: `src/lib/validation/marketing.ts`
- Schema: `segments`, `campaigns`, `campaign_recipients`
- Tests: `tests/integration/marketing.test.ts`, `tests/e2e/05-marketing.spec.ts`, `tests/unit/metrics.test.ts`

## Invariants

1. Segment criteria combine AND across fields and OR within tags. Archived contacts are excluded. The live count reflects current data.
2. Empty criteria are rejected. A segment can be archived; archived segments are read-only for new campaigns.
3. Campaigns have a supported channel, a USD budget, optional start/end dates, and a lifecycle (`draft`, `active`, `completed`, `archived`). End dates cannot precede start dates; budgets cannot be negative.
4. Activation requires a non-empty audience. Activation snapshots the segment name, criteria, and matching recipients so later contact changes do not alter the audience.
5. Recipient engagement is manual: `targeted`, `sent`, `opened`, `clicked`, `responded`, `converted`. Status can be corrected; the update time is recorded.
6. Campaign sending is out of scope. Activation creates records, not messages.
7. Metrics use the snapshot: audience size, status counts, response rate, and conversion rate. Empty audiences produce zero-valued metrics.
8. Campaign filters, search, and sorting preserve the selected status, channel, and owner.

## Workflow

1. Read the marketing spec and the segment/campaign service first.
2. Keep snapshot creation in the activation transaction; do not derive the audience from live criteria after activation.
3. Add integration coverage for snapshot immutability and lifecycle guards.
4. Verify empty-audience and archived read-only behavior in E2E.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:integration tests/integration/marketing.test.ts`
- `pnpm test:e2e tests/e2e/05-marketing.spec.ts`
