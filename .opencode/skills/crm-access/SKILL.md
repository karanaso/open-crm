---
name: crm-access
description: Module context for OpenCRM workspace access. Use when a task touches first-run setup, sign-in/out, invitations, password resets, roles, team administration, profile, sessions, or route/action guards.
---

# CRM Access

Load this skill with `backend`, `frontend`, or `qa` when the task touches authentication, onboarding, roles, or workspace settings.

## Module map

- Spec: `openspec/specs/workspace-access/spec.md`
- Routes:
  - `src/app/(auth)/setup/page.tsx`
  - `src/app/(auth)/login/page.tsx`
  - `src/app/(auth)/invite/[token]/page.tsx`
  - `src/app/(auth)/reset/[token]/page.tsx`
  - `src/app/(app)/settings/page.tsx`
  - `src/app/(app)/settings/profile/page.tsx`
  - `src/app/(app)/settings/team/page.tsx`
- Components: `src/components/auth/**`, `src/components/settings/**`, `src/components/layout/user-menu.tsx`
- Server Actions: `src/actions/auth.ts`, `src/actions/team.ts`
- Services: `src/lib/services/setup.ts`, `src/lib/services/invites.ts`, `src/lib/services/users.ts`
- Auth helpers: `src/lib/auth/**`
- Validation: `src/lib/validation/auth.ts`
- Schema: `users`, `invites`, `password_reset_tokens`, `login_attempts`
- Tests: `tests/integration/auth.test.ts`, `tests/e2e/01-auth.spec.ts`, `tests/e2e/08-a11y.spec.ts`

## Invariants

1. First-run setup is available only while no user exists; the first account becomes an administrator.
2. Onboarding is invite-only. Invite tokens are single-use and valid for 7 days; reset tokens are single-use and valid for 24 hours. Links are shared out of band; there is no email delivery.
3. The last active administrator cannot be deactivated or demoted.
4. Roles are `admin` and `member`. Administrators manage the team, invitations, resets, and pipeline configuration; members manage CRM records.
5. Sign-in failures are throttled. Invalid credentials return a generic error; inactive accounts are refused.
6. Every protected page, Server Action, and API route enforces a session. Admin-only mutations also enforce role.
7. Password changes require the current password. Redeeming a reset signs out other sessions.
8. One workspace per deployment; all active members share records. Do not add `workspace_id`.
9. A user locale preference will live on `users.locale`; see the `add-ui-localization` change before adding locale-aware auth pages.

## Workflow

1. Read the workspace-access spec and the relevant service or action.
2. Check both the page and the action/route guard; do not fix only the UI.
3. Keep tokens hashed at rest and never log them.
4. Add integration coverage for authorization and token lifecycle; add E2E coverage for the user journey.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:integration tests/integration/auth.test.ts`
- `pnpm test:e2e tests/e2e/01-auth.spec.ts`
- `pnpm build` for release-level changes
