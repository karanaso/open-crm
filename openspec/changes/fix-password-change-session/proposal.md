# Proposal

## Why

Changing a password increments `users.sessionVersion`, but the sign-in page only checks whether a JWT exists. It redirects the now-stale session to `/dashboard`; the authenticated layout checks `sessionVersion`, rejects it, and redirects back to `/login`. The two pages bounce the user between `/login` and `/dashboard`.

The current action tries to sign in again with the new password. That is fragile, does not help sessions that are already stale on another device, and can leave the initiating tab in the same loop.

## What Changes

- After a successful password change, end the current session and redirect to `/login?changed=1` with a localized success notice instead of re-signing in.
- Invalidate the user's other active sessions through the existing `sessionVersion` increment.
- Make the sign-in page validate the existing session against the user record before redirecting to the dashboard. A stale, deactivated, or otherwise invalid session MUST see the sign-in form, not a redirect loop.
- Remove the now-unreachable profile `?changed=1` banner and show the password-change success notice on the sign-in page.
- Add an end-to-end test that reproduces the loop with two browser sessions, verifies the redirect to sign-in, signs in with the new password, rejects the old password, and restores the original password.
- Update the workspace-access password-change requirement and document the new sign-out behavior.

Out of scope: adding database checks to Edge middleware, changing the password policy, redesigning other authentication flows, or adding a session-management UI.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-access`: password changes now end the current session and redirect to sign-in; the sign-in page must not treat a stale session as authenticated.

## Impact

- Touches `src/actions/auth.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(app)/settings/profile/page.tsx`, `messages/en.json`, `messages/el.json`, and tests.
- No database, API, or dependency changes.
- This is a deliberate behavior change: the current password-change flow keeps the initiating session active; the new flow signs it out and requires a fresh sign-in.
