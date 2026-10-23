# Spec Delta

## ADDED Requirements

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
