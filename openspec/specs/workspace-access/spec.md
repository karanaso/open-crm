# workspace-access Specification

## Purpose

Define how team members join the CRM, authenticate, and receive permissions so that only authorized people can access customer data.

## Requirements

### Requirement: First-run workspace setup

The system SHALL present a setup flow while no user accounts exist. Setup MUST require a display name, valid email, and a password of 12 to 128 characters, and MUST create the first account as an active administrator. Once any account exists, setup MUST redirect to sign-in and MUST NOT create accounts.

#### Scenario: First administrator is created

- **WHEN** no accounts exist and a visitor submits valid setup details
- **THEN** the system creates an active admin account, signs the visitor in, and opens the dashboard

#### Scenario: Setup closes after initialization

- **WHEN** at least one account exists and a visitor requests the setup page
- **THEN** the system redirects to sign-in and does not create an account

#### Scenario: Invalid setup details are rejected

- **WHEN** setup is submitted with a short password, an invalid email, or a blank name
- **THEN** the system redisplays the form with field-level errors and creates nothing

### Requirement: Credential sign-in

The system SHALL authenticate users with a valid email and password combination and create a session. Invalid credentials MUST return a generic error that does not reveal whether the email exists. Accounts with inactive status MUST NOT sign in.

#### Scenario: Valid credentials sign in

- **WHEN** an active user submits their correct email and password
- **THEN** the system creates a session and opens the dashboard

#### Scenario: Invalid password returns a generic error

- **WHEN** a user submits an email with the wrong password
- **THEN** the system rejects the attempt with a message that does not confirm whether the email exists

#### Scenario: Inactive account is refused

- **WHEN** a deactivated user submits valid credentials
- **THEN** the system refuses to create a session and reports that the account is unavailable

### Requirement: Sign-out

The system SHALL provide a sign-out control that ends the current session and redirects to the sign-in page. After sign-out, protected pages MUST NOT be accessible with the previous session.

#### Scenario: User signs out

- **WHEN** an authenticated user selects sign out
- **THEN** the session ends and the user is redirected to sign-in

#### Scenario: Signed-out session cannot access protected pages

- **WHEN** a signed-out user requests a protected page
- **THEN** the system redirects to sign-in instead of showing CRM data

### Requirement: Sign-in throttling

The system MUST limit repeated failed sign-in attempts for the same email address. After five failed attempts within 15 minutes, further attempts for that email MUST be rejected for 15 minutes, even when the correct password is supplied. A successful sign-in MUST reset the failure count.

#### Scenario: Sixth attempt is blocked

- **WHEN** a user fails sign-in five times within 15 minutes and then submits the correct password
- **THEN** the system rejects the attempt until the lockout window expires

#### Scenario: Successful sign-in resets failures

- **WHEN** a user fails sign-in twice and then succeeds
- **THEN** the failure count for that email is reset

### Requirement: Invitation-based onboarding

Administrators MUST be able to invite a teammate by email address and role. The system MUST generate a single-use invitation link valid for seven days, show it once, and prevent invitations for emails that already have an account. The invitee MUST set a display name and password before the account becomes active.

#### Scenario: Invitee joins the workspace

- **WHEN** an invitee opens a valid invitation link and submits a display name and valid password
- **THEN** the system creates an active account with the invited role and marks the invitation accepted

#### Scenario: Invitation cannot be reused

- **WHEN** an invitation has already been accepted and the link is opened again
- **THEN** the system rejects the invitation and does not create another account

#### Scenario: Expired invitation is rejected

- **WHEN** an invitation older than seven days is opened
- **THEN** the system rejects it and directs the visitor to contact an administrator

#### Scenario: Existing account cannot be invited

- **WHEN** an administrator invites an email that already belongs to an account
- **THEN** the system rejects the request and explains that the person already has access

### Requirement: Role permissions

The system MUST enforce two roles: administrator and member. Both roles MUST be able to view all CRM records and create or edit companies, contacts, deals, tickets, activities, tasks, segments, and campaigns. Only administrators MUST be able to manage the team, create invitations and reset links, change roles, deactivate members, and configure pipelines.

#### Scenario: Member cannot administer the team

- **WHEN** a member requests the team administration page or submits a role change
- **THEN** the system denies the request and returns a forbidden response

#### Scenario: Member can manage CRM records

- **WHEN** a member creates a contact or moves a deal
- **THEN** the system saves the change and attributes it to that member

#### Scenario: Administrator can manage the team

- **WHEN** an administrator changes a member's role
- **THEN** the system applies the new role and requires the member's next request to use the updated permissions

### Requirement: Team administration

Administrators MUST be able to list active and inactive members, change roles, deactivate accounts, reactivate accounts, and revoke pending invitations. The system MUST prevent deactivating or demoting the last active administrator. Deactivation MUST block access immediately, including for sessions that are already signed in.

#### Scenario: Administrator deactivates a member

- **WHEN** an administrator deactivates a member who is currently signed in
- **THEN** that member's next request is rejected and they are redirected to sign-in

#### Scenario: Last administrator is protected

- **WHEN** an administrator attempts to deactivate or demote the only remaining active administrator
- **THEN** the system rejects the change and explains that another administrator must be appointed first

#### Scenario: Reactivation restores access

- **WHEN** an administrator reactivates a deactivated member
- **THEN** the member can sign in again with their existing credentials

### Requirement: Password change

Signed-in users MUST be able to change their password by supplying their current password and a new password of 12 to 128 characters. The system MUST reject a wrong current password and MUST invalidate the user's other active sessions after a successful change.

#### Scenario: Password is changed

- **WHEN** a signed-in user supplies the correct current password and a valid new password
- **THEN** the system stores the new password, keeps the current session active, and signs out the user's other sessions

#### Scenario: Wrong current password is rejected

- **WHEN** a user supplies an incorrect current password
- **THEN** the system rejects the change and leaves the existing password in place

### Requirement: Administrator-issued password reset

Administrators MUST be able to generate a single-use password reset link for a member. The link MUST be valid for 24 hours, shown once, and MUST replace any earlier unredeemed reset link for that user. Redeeming the link MUST require a new password of 12 to 128 characters and MUST invalidate the user's other sessions.

#### Scenario: Member resets a forgotten password

- **WHEN** an administrator issues a reset link and the member opens it and submits a valid new password
- **THEN** the system updates the password, consumes the link, and allows the member to sign in

#### Scenario: Reset link cannot be reused

- **WHEN** a reset link has already been redeemed and is opened again
- **THEN** the system rejects it and does not change the password

#### Scenario: Expired reset link is rejected

- **WHEN** a reset link older than 24 hours is opened
- **THEN** the system rejects it and instructs the member to request a new link from an administrator

### Requirement: Session enforcement

Every application page and server action except setup, sign-in, invitation acceptance, and password reset MUST require a session belonging to an active user. Unauthenticated page requests MUST redirect to sign-in with the requested path preserved. Unauthenticated server actions MUST return an unauthorized response without reading or writing CRM data. Sessions MUST expire after seven days without use.

#### Scenario: Unauthenticated page request redirects

- **WHEN** a visitor without a session requests the contacts page
- **THEN** the system redirects to sign-in and returns to the contacts page after successful authentication

#### Scenario: Unauthenticated action is rejected

- **WHEN** a request without a session invokes a server action that modifies a deal
- **THEN** the system rejects the request without changing data

#### Scenario: Expired session requires sign-in

- **WHEN** a session has not been used for seven days
- **THEN** the next request is treated as unauthenticated and redirects to sign-in

### Requirement: Interface language preference

Signed-in users SHALL be able to choose English or Greek from profile settings. The choice MUST persist on the user record, apply without signing out, and be used on the next sign-in from any device. Setup, sign-in, invitation, and reset pages MUST offer a language control that persists the choice in a cookie. English MUST remain the default.

#### Scenario: User changes language in profile

- **WHEN** a signed-in user selects Greek in profile settings
- **THEN** the interface switches to Greek immediately and remains Greek after reload

#### Scenario: New device uses the profile language

- **WHEN** a user who chose Greek signs in on a new browser
- **THEN** the interface opens in Greek

#### Scenario: Auth page language control

- **WHEN** a visitor selects Greek on the sign-in or setup page
- **THEN** the page switches to Greek and the choice is used on the next visit

#### Scenario: Default language

- **WHEN** a new account is created without a language choice
- **THEN** the account uses English
