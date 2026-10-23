# Design

## Context

See `proposal.md` for motivation and `specs/workspace-access/spec.md` for the behavior contract.

Current password-change path:

```text
changePassword()
  -> updates passwordHash
  -> increments users.sessionVersion
changePasswordAction()
  -> signIn(credentials, new password, redirectTo="/settings/profile?changed=1")
  -> if sign-in fails, returns an error and leaves the old JWT in place
```

Current session checks:

```text
old JWT (sessionVersion = 1)
        |
        v
/login -- auth() is truthy --> /dashboard
   ^                              |
   |                              v
   +---- requireUser(): DB version 2 != JWT version 1
```

- `src/app/(auth)/login/page.tsx` redirects to `/dashboard` whenever `auth()` returns a session. It does not check the user record.
- `src/app/(app)/layout.tsx` calls `requireUser()`, which calls `getCurrentUser()`; that rejects a user whose status is inactive or whose `sessionVersion` no longer matches the JWT, and redirects to `/login`.
- `src/middleware.ts` only checks that a JWT exists; it cannot compare `sessionVersion` at the Edge.
- The initiating tab can loop when the re-sign-in fails to replace the JWT. Other sessions always loop because only the initiating tab is re-signed in.

## Goals / Non-Goals

**Goals:**

- A password change ends the current session and invalidates the user's other sessions.
- The user lands on sign-in with a localized success notice.
- A stale or deactivated session that reaches `/login` sees the sign-in form instead of bouncing to `/dashboard`.
- Add a regression test that reproduces the loop with two independent browser sessions.

**Non-Goals:**

- Adding a database lookup to Edge middleware.
- Changing password policy, Argon2 parameters, or reset-link behavior.
- Adding a session-management UI or per-device revocation.
- Changing the JWT payload or Auth.js session strategy.

## Decisions

### D1. Sign out instead of re-signing in

After `changePassword` succeeds, `changePasswordAction` will call `signOut({ redirect: false })` and then `redirect("/login?changed=1")`. The `signIn` retry is removed.

**Why:** the requested behavior is a fresh sign-in. Signing out deterministically removes the stale JWT, while the `sessionVersion` increment invalidates other sessions. Re-signing in only refreshes one tab and is the fragile part of the current flow.

**Alternative considered:** keep re-signing in and add a fallback. Rejected because it still leaves other sessions with stale JWTs and adds another failure path.

### D2. Make the sign-in page validate the session

`src/app/(auth)/login/page.tsx` will use `getCurrentUser()` instead of `auth()`. A valid, active, current session still redirects to `/dashboard`; a stale, deactivated, or missing user is treated as unauthenticated and sees the form.

**Why:** this is the other half of the loop. The layout and the sign-in page must use the same session-validity rule. It also fixes the same bounce for deactivated users.

**Alternative considered:** add a session-version check in middleware. Rejected because Edge middleware cannot query PostgreSQL without adding a remote validation service or a signed version cookie; the layout already performs the authoritative check.

### D3. Success notice on sign-in and remove the profile banner

- Add `auth.passwordChangedSuccess` for the sign-in page.
- Show it when `/login?changed=1` is present, alongside the existing reset notice.
- Remove the profile page's `?changed=1` banner and the unused `settings.passwordUpdated` key.

**Why:** the user no longer returns to the profile page after a password change; the success feedback belongs on the page they actually see.

### D4. Test the loop at the browser boundary

Add `tests/e2e/11-password-change.spec.ts` with two independent browser contexts:

1. Both contexts sign in as the admin.
2. Context A changes the password and must land on `/login?changed=1` with the success notice.
3. Context B requests `/dashboard`; it must land on `/login`, remain there, and show the form.
4. Context B rejects the old password, accepts the new password, and reaches the dashboard.
5. Context B restores the original password so the suite can be rerun.

On the current code this test should fail: context B loops between `/dashboard` and `/login`, and context A may also fail to land on sign-in. The applying agent should run the test before the fix and record the observed failure.

**Why E2E:** the bug depends on JWT cookies, `sessionVersion`, the middleware matcher, and the two server-rendered layouts. A unit test of `changePassword` alone cannot observe the redirect loop.

## Risks / Trade-offs

- **`signOut` failure** → the password is already changed but the old JWT remains. The sign-in page's `getCurrentUser()` check still prevents the loop; the user can sign in with the new password. The action should not report the password change as failed.
- **Extra database read on sign-in** → the login page is already dynamic and protected by `countUsers()`; one user lookup is acceptable.
- **Other sessions are intentionally signed out** → users on other devices see the sign-in form and must use the new password.
- **E2E changes the admin password** → the test restores the original password and runs last, after the other specs. If it fails before restoration, the disposable E2E database is reset on the next run.
- **Unused catalog key** → remove `settings.passwordUpdated` from both catalogs when the profile banner is removed; `pnpm i18n:check` guards parity.

## Migration Plan

1. Add the failing E2E test and run it to record the loop.
2. Update the action, sign-in page, profile page, and catalogs.
3. Deploy. No database migration or data rewrite.
4. Rollback: revert the code. Password changes already made remain valid; sessions ended by the new flow must sign in again.

## Open Questions

None blocking.
