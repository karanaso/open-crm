---
name: crm-support
description: Module context for the OpenCRM support desk. Use when a task touches tickets, status transitions, assignment, comments, priorities, or first-response and resolution SLA tracking.
---

# CRM Support

Load this skill with `backend`, `frontend`, or `qa` when the task touches tickets, comments, or SLA behavior.

## Module map

- Spec: `openspec/specs/support-desk/spec.md`
- Routes: `src/app/(app)/tickets/**`
- Components: `src/components/tickets/**`
- Server Actions: `src/actions/tickets.ts`
- Services: `src/lib/services/tickets.ts`
- Status machine: `src/lib/ticket-status.ts`
- SLA: `src/lib/sla.ts`, `src/lib/constants.ts` (`SLA_HOURS`)
- Validation: `src/lib/validation/ticket.ts`
- Schema: `tickets`, `ticket_comments`
- Tests: `tests/integration/tickets.test.ts`, `tests/e2e/04-tickets.spec.ts`, `tests/unit/sla.test.ts`, `tests/unit/ticket-status.test.ts`

## Invariants

1. A ticket requires a requester contact. The company is derived from the requester. New tickets start unassigned.
2. Status transitions follow `TICKET_TRANSITIONS` in `src/lib/ticket-status.ts`. Invalid transitions are rejected.
3. SLA targets are calendar hours in UTC, by priority:

   | Priority | First response | Resolution |
   | --- | ---: | ---: |
   | urgent | 1h | 8h |
   | high | 4h | 24h |
   | normal | 8h | 48h |
   | low | 24h | 72h |

4. The first public reply records `firstResponseAt`. Internal notes do not. Resolving records `resolvedAt`; reopening reactivates resolution tracking.
5. A priority change recalculates SLA due dates from the ticket creation time.
6. Internal notes are visible only to signed-in members. Public replies are part of the customer-facing record.
7. Only active users can be assigned. Unassigned and overdue filters must stay accurate.
8. Ticket detail shows SLA state and linked activities/tasks; ticket summaries appear on contact and company detail pages.

## Workflow

1. Read the support spec, `ticket-status.ts`, and `sla.ts` before changing behavior.
2. Keep status and SLA rules in services or pure helpers; components render the result.
3. Add unit coverage for status/SLA edge cases and integration coverage for mutations.
4. Verify the reply/internal-note visibility boundary in E2E.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:integration tests/integration/tickets.test.ts`
- `pnpm test:e2e tests/e2e/04-tickets.spec.ts`
