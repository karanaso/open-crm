# Tasks

## 1. Regression test

- [x] 1.1 Add `tests/e2e/11-password-change.spec.ts` with two independent browser contexts: both sign in as `ADMIN`; context A changes the password and must land on `/login?changed=1`; context B requests `/dashboard`, stays on `/login`, sees the form, rejects the old password, and accepts the new password; restore `ADMIN.password` at the end. Verify by running `pnpm test:e2e tests/e2e/11-password-change.spec.ts` against the current code and recording the `/login` ↔ `/dashboard` failure.
- [x] 1.2 Capture the current failure in the handoff (URLs and the stale-session loop) so the fix has a documented reproduction; verify the test output names the failing assertion.

## 2. Session behavior

- [x] 2.1 In `src/actions/auth.ts`, replace the post-change `signIn` retry with `await signOut({ redirect: false })` followed by `redirect("/login?changed=1")`; verify the diff no longer calls `signIn` after `changePassword`.
- [x] 2.2 In `src/app/(auth)/login/page.tsx`, replace `auth()` with `getCurrentUser()`; redirect only a valid, active, current session to `/dashboard`; verify the new E2E's stale context sees the sign-in form.
- [x] 2.3 Add `auth.passwordChangedSuccess` to both catalogs, show it for `?changed=1` on the sign-in page, remove the profile page's `?changed=1` banner and the now-unused `settings.passwordUpdated` key; verify `pnpm i18n:check` and the success notice in the E2E.
- [x] 2.4 Update `README.md` under team/password operations to state that a password change signs out the current session and other sessions and requires signing in with the new password; verify the documented behavior matches the E2E.
- [x] 2.5 Run `pnpm test:e2e tests/e2e/11-password-change.spec.ts` and verify it passes, including old-password rejection and new-password sign-in.

## 3. Integration verification

- [x] 3.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, and `pnpm i18n:check`; verify all pass.
- [x] 3.2 Run `pnpm test:e2e` and `pnpm build`; verify the password-change spec passes in the full serial suite, the suite is 41/42 with the known unrelated `07-shell.mobile.spec.ts` timing flake (passing in isolation), and the production build passes.

## Workflow follow-up

- Archive the change after review and verification.
- Sync the `workspace-access` delta into the main spec during archive.
