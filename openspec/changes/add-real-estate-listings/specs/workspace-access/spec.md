# Spec Delta

## MODIFIED Requirements

### Requirement: Session enforcement

Every application page and server action except setup, sign-in, invitation acceptance, and password reset MUST require a session belonging to an active user. Unauthenticated page requests MUST redirect to sign-in with the requested path preserved. Unauthenticated server actions MUST return an unauthorized response without reading or writing CRM data. Sessions MUST expire after seven days without use. The public listings read API is the only unauthenticated data surface and MUST expose only active public listing fields, never seller, agent, commission, activity, task, or other CRM data.

#### Scenario: Unauthenticated page request redirects

- **WHEN** a visitor without a session requests the contacts page
- **THEN** the system redirects to sign-in and returns to the contacts page after successful authentication

#### Scenario: Unauthenticated action is rejected

- **WHEN** a request without a session invokes a server action that modifies a deal
- **THEN** the system rejects the request without changing data

#### Scenario: Public listings API is unauthenticated

- **WHEN** a client without a session requests the public listings API
- **THEN** the system returns active public listing data without a redirect or authentication challenge

#### Scenario: Public listings API exposes no CRM data

- **WHEN** the public listings API responds
- **THEN** it contains no seller, agent, commission, activity, task, ticket, campaign, or other private CRM record

#### Scenario: Expired session requires sign-in

- **WHEN** a session has not been used for seven days
- **THEN** the next request is treated as unauthenticated and redirects to sign-in
