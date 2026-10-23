---
name: crm-sales
description: Module context for the OpenCRM sales pipeline. Use when a task touches pipelines, stages, deals, the Kanban board, stage movement, win/loss lifecycle, or pipeline metrics.
---

# CRM Sales

Load this skill with `backend`, `frontend`, or `qa` when the task touches pipelines, stages, or deals.

## Module map

- Spec: `openspec/specs/sales-pipeline/spec.md`
- Routes:
  - `src/app/(app)/deals/**`
  - `src/app/(app)/settings/pipelines/page.tsx`
- Components: `src/components/deals/**`
- Server Actions: `src/actions/deals.ts`, `src/actions/pipelines.ts`
- Services: `src/lib/services/deals.ts`, `src/lib/services/pipelines.ts`
- Validation: `src/lib/validation/deal.ts`
- Schema: `pipelines`, `pipeline_stages`, `deals`
- Tests: `tests/integration/deals.test.ts`, `tests/e2e/03-deals.spec.ts`, `tests/unit/metrics.test.ts`

## Invariants

1. Exactly one pipeline is the default. The default pipeline is preselected for new deals and cannot be archived.
2. Every pipeline keeps at least one open, one won, and one lost stage. A stage with deals cannot be removed; a pipeline with deals cannot be archived.
3. A deal's stage must belong to its pipeline, and its contact must belong to the selected company. Negative amounts are rejected. Amounts are USD.
4. Deal status is derived from the stage outcome, not edited directly. Winning requires the won stage; losing requires a reason; reopening returns the deal to an open stage.
5. The Kanban board follows stage order, supports drag-and-drop and the keyboard move menu, and shows an empty column state.
6. Moving a deal records a stage-change activity. Do not duplicate that entry from the timeline module.
7. Weighted value uses stage probability. Per-stage metrics update after a move.
8. Deal filters, search, sorting, and pagination preserve the selected pipeline and filters.

## Workflow

1. Read the sales spec and the affected service first.
2. Keep pipeline invariants in services and transactions; components render state and call actions.
3. Update integration coverage for stage/status rules and E2E coverage for create, move, win, lose, and reopen.
4. Check the default-pipeline and occupied-stage edge cases before changing configuration UI.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:integration tests/integration/deals.test.ts`
- `pnpm test:e2e tests/e2e/03-deals.spec.ts`
