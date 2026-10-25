# Spec Delta

## REMOVED Requirements

### Requirement: No message delivery

**Reason**: The system-level prohibition is superseded by the `outbound-messaging` capability, which becomes the only path that can contact recipients. Campaigns remain manual planning and tracking records, so the prohibition as written is no longer accurate.

**Migration**: No data migration. Campaign activation behavior is unchanged: recipients are still created with targeted status and no message is sent. The retained behavior is restated in the added requirement below.

## ADDED Requirements

### Requirement: Campaigns do not deliver messages

Campaigns SHALL remain planning and tracking records. Activating a campaign MUST create recipients with targeted status and MUST NOT contact them. Every engagement status MUST be recorded manually by an active team member, and each change MUST be attributed to that member. A campaign channel MUST NOT trigger delivery.

#### Scenario: Activation does not send messages

- **WHEN** a member activates a campaign
- **THEN** recipients are created with targeted status and no message is delivered

#### Scenario: Engagement is manual

- **WHEN** a recipient's status changes
- **THEN** the change is attributed to the team member who recorded it

#### Scenario: Email channel does not trigger delivery

- **WHEN** a member activates a campaign whose channel is email
- **THEN** no recipient is contacted and engagement remains manual
