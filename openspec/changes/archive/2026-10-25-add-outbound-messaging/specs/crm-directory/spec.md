# Spec Delta

## ADDED Requirements

### Requirement: Contact email outreach state

Every contact SHALL have a do-not-email state that defaults to off. Active team members MUST be able to set and clear it from the contact record. The state MUST persist across edits, archiving, and restoration, and MUST NOT remove the contact from the directory, segments, or campaigns.

#### Scenario: Member sets do-not-email

- **WHEN** a member marks a contact as do-not-email
- **THEN** the contact shows the state and messages no longer email that contact

#### Scenario: Contact remains in the directory

- **WHEN** a contact has do-not-email set
- **THEN** the contact still appears in directory lists, segments, and campaign audiences

#### Scenario: State survives archiving

- **WHEN** a contact with do-not-email set is archived and later restored
- **THEN** the contact still has do-not-email set

#### Scenario: Member clears do-not-email

- **WHEN** a member clears a contact's do-not-email state
- **THEN** the contact becomes eligible for future messages

### Requirement: Contact message history

A contact detail page MUST show the messages that included the contact, newest first, with subject, send time, and that contact's delivery outcome, each linking to its message. Entries skipped for that contact MUST show the skip reason. The section MUST be read-only.

#### Scenario: Sent message appears on the contact

- **WHEN** a message is sent to a group containing a contact
- **THEN** the contact detail page shows the message with its subject and send time

#### Scenario: Skipped entry shows the reason

- **WHEN** a contact was skipped for a message
- **THEN** the contact detail page shows the message with the skip reason

#### Scenario: Newest message appears first

- **WHEN** a contact has received several messages
- **THEN** the most recent message appears first

#### Scenario: Entry links to the message

- **WHEN** a member selects a message in the contact history
- **THEN** the message detail page opens
