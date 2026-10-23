# Spec Delta

## MODIFIED Requirements

### Requirement: Password change

Signed-in users MUST be able to change their password by supplying their current password and a new password of 12 to 128 characters. The system MUST reject a wrong current password. After a successful change, the system MUST end the current session and invalidate the user's other active sessions, then redirect to sign-in with a success notice.

#### Scenario: Password is changed

- **WHEN** a signed-in user supplies the correct current password and a valid new password
- **THEN** the system stores the new password, ends the current session, invalidates the user's other sessions, and redirects to sign-in with a success notice

#### Scenario: Wrong current password is rejected

- **WHEN** a user supplies an incorrect current password
- **THEN** the system rejects the change and leaves the existing password in place

#### Scenario: New password signs in

- **WHEN** the user signs in after the change with the new password
- **THEN** sign-in succeeds

#### Scenario: Old password is rejected

- **WHEN** the user tries to sign in with the password used before the change
- **THEN** sign-in is rejected

## ADDED Requirements

### Requirement: Stale session at sign-in

The sign-in page MUST validate an existing session against the user record before redirecting to the dashboard. A session whose user, status, or session version no longer matches MUST be treated as unauthenticated and shown the sign-in form.

#### Scenario: Password-change stale session

- **WHEN** a session was invalidated by a password change and opens the sign-in page
- **THEN** the sign-in form is shown instead of a redirect to the dashboard

#### Scenario: Deactivated session

- **WHEN** a deactivated user's session opens the sign-in page
- **THEN** the sign-in form is shown instead of a redirect to the dashboard

#### Scenario: Valid session

- **WHEN** an active, current session opens the sign-in page
- **THEN** the system redirects to the dashboard

#### Scenario: No redirect loop

- **WHEN** a stale session is sent from a protected page to sign-in
- **THEN** the URL remains the sign-in page and the form is visible
