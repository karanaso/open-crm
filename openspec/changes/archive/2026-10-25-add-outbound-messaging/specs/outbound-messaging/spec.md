# Spec Delta

## Purpose

Let active team members compose, send, and retain plain-text relationship email to grouped or segmented contacts, with an auditable per-recipient delivery record.

## ADDED Requirements

### Requirement: Recipient group management

Active team members SHALL create, rename, describe, and archive static recipient groups, and add or remove contacts. A group name is required. Archived groups MUST NOT be selectable for a new message, and messages already sent from a group MUST retain their snapshot.

#### Scenario: Group is created

- **WHEN** a member creates a group named "Q1 renewals" and adds three contacts
- **THEN** the group is saved and shows three members

#### Scenario: Member is removed

- **WHEN** a member removes a contact from a group
- **THEN** the group member count decreases and the contact remains in the directory

#### Scenario: Archived group is unavailable

- **WHEN** a member archives a group
- **THEN** it no longer appears in the audience picker for new messages

#### Scenario: Duplicate member is rejected

- **WHEN** a member adds a contact that is already in the group
- **THEN** the membership is unchanged and no duplicate is stored

### Requirement: Message composition

Active team members SHALL create a draft with a required subject, a required body, and one audience source: a recipient group or a segment. Messages are email-only. Subject MUST be at most 200 characters and body at most 10,000 characters. Drafts MUST remain editable until sent.

#### Scenario: Draft is saved

- **WHEN** a member saves a draft with a subject, body, and recipient group
- **THEN** the message is stored in draft status and appears in the message list

#### Scenario: Subject is required

- **WHEN** a member saves a message without a subject
- **THEN** the system rejects it and asks for a subject

#### Scenario: Audience source is required

- **WHEN** a member saves a message without selecting a group or segment
- **THEN** the system rejects it and asks for an audience

#### Scenario: Draft is edited

- **WHEN** a member changes the body of a draft
- **THEN** the updated body is shown the next time the draft is opened

### Requirement: Merge fields

The body MAY contain the placeholders `{{firstName}}`, `{{lastName}}`, and `{{company}}`. Saving MUST reject any other placeholder. At send time each placeholder MUST be replaced with the recipient's value, and a missing value MUST render as an empty string.

#### Scenario: Supported placeholders are saved

- **WHEN** a draft body contains `{{firstName}}` and `{{company}}`
- **THEN** the draft is saved unchanged

#### Scenario: Unknown placeholder is rejected

- **WHEN** a draft body contains `{{email}}`
- **THEN** the system rejects the save and identifies the unsupported placeholder

#### Scenario: Missing company renders empty

- **WHEN** a contact without a company receives a body containing `{{company}}`
- **THEN** the sent body contains no value in that position

### Requirement: Send eligibility

When a message is sent, every contact in the frozen audience MUST become a recipient. A recipient MUST be marked skipped with a reason when the contact is archived, has no usable email address, or has do-not-email set. Sending MUST be rejected when no audience contact is eligible.

#### Scenario: Contact with do-not-email is skipped

- **WHEN** a group contains a contact whose do-not-email state is set
- **THEN** that recipient is stored as skipped and no message is sent to it

#### Scenario: Archived contact is skipped

- **WHEN** a frozen audience contains an archived contact
- **THEN** that recipient is stored as skipped and no message is sent to it

#### Scenario: No eligible recipients blocks the send

- **WHEN** every contact in the audience is ineligible
- **THEN** the send is rejected and no recipients are stored as queued

#### Scenario: Eligible count is shown before sending

- **WHEN** a member opens the send confirmation
- **THEN** the confirmation shows the total audience and the number of eligible recipients

### Requirement: Audience freeze

Sending MUST freeze the audience at that moment and retain the source name and segment criteria when applicable. Later changes to the group, segment, or contact data MUST NOT add, remove, or re-target recipients. A message MUST NOT be sent more than once.

#### Scenario: Group changes do not alter a sent message

- **WHEN** a member adds a contact to a group after a message was sent from it
- **THEN** the sent message still shows its original recipients

#### Scenario: Segment changes do not alter a sent message

- **WHEN** a segment is edited after a message was sent from it
- **THEN** the sent message still shows its original recipients and snapshot criteria

#### Scenario: Resending is blocked

- **WHEN** a member opens a completed message
- **THEN** no action sends the whole message again

#### Scenario: Source name is retained

- **WHEN** the source group is renamed or archived after sending
- **THEN** the message still shows the name used at send time

### Requirement: Delivery outcomes

Each recipient MUST have exactly one of queued, sent, failed, or skipped, and failed and skipped recipients MUST record a reason. Status MUST reflect transport acceptance only; the system MUST NOT report delivery or bounce without provider feedback.

#### Scenario: Accepted message is marked sent

- **WHEN** the transport accepts a recipient's message
- **THEN** the recipient is stored as sent and the sent count increases

#### Scenario: Transport error is recorded

- **WHEN** the transport rejects a recipient's message
- **THEN** the recipient is stored as failed with a reason and the failure count increases

#### Scenario: Outcomes are counted

- **WHEN** a member opens a completed message
- **THEN** the detail view shows counts for sent, failed, and skipped recipients

### Requirement: Partial failure

A failure for one recipient MUST NOT stop delivery to the remaining queued recipients. A message MUST reach completed status only when every recipient is in a terminal state.

#### Scenario: One failure does not stop the batch

- **WHEN** the transport fails for the third recipient of ten
- **THEN** the remaining recipients are still attempted and each records its own outcome

#### Scenario: Message completes after all outcomes

- **WHEN** every recipient is sent, failed, or skipped
- **THEN** the message moves to completed status

### Requirement: Retry unsent

Active team members SHALL retry a completed or interrupted message for recipients still queued or failed. Retrying MUST NOT resend to recipients already marked sent and MUST NOT retry skipped recipients.

#### Scenario: Retry sends only unsent rows

- **WHEN** a member retries a message with two failed and eight sent recipients
- **THEN** only the two failed recipients are attempted again

#### Scenario: Sent recipients are never duplicated

- **WHEN** a retry succeeds for a failed recipient
- **THEN** the sent recipients keep their original outcome and receive no second message

#### Scenario: Skipped recipients are not retried

- **WHEN** a member retries a message containing skipped recipients
- **THEN** the skipped recipients remain skipped

### Requirement: Message lifecycle

Messages MUST be draft, sending, completed, or cancelled. Sending MUST move a draft to sending, then to completed when every recipient is terminal. An interrupted send MUST remain sending until it is completed or cancelled. Cancelling MUST be allowed only while sending and MUST mark remaining queued recipients as skipped.

#### Scenario: Send advances the status

- **WHEN** a member sends a draft
- **THEN** the message moves to sending and finally to completed

#### Scenario: Interrupted send stays resumable

- **WHEN** the process stops before every recipient is terminal
- **THEN** the message remains in sending status with queued recipients available for retry

#### Scenario: Cancelling closes remaining recipients

- **WHEN** a member cancels a message in sending status
- **THEN** the message becomes cancelled and remaining queued recipients become skipped

#### Scenario: Sent content is read-only

- **WHEN** a message has left draft status
- **THEN** its subject, body, and audience cannot be changed

### Requirement: Recipient cap

A single message MUST NOT exceed the configured recipient maximum. Sending above the limit MUST be rejected and MUST state the current limit. The confirmation step MUST show the eligible recipient count before delivery begins.

#### Scenario: Over-limit send is rejected

- **WHEN** a member attempts to send to more recipients than the configured maximum
- **THEN** the send is rejected, nothing is delivered, and the limit is shown

#### Scenario: Send at the limit is allowed

- **WHEN** the eligible recipient count equals the configured maximum
- **THEN** the send proceeds

### Requirement: Message list

The message list MUST show messages newest first with subject, audience name, recipient counts, status, and send time. It MUST support filtering by status, text search by subject, and pagination, and selected filters MUST be preserved in the URL.

#### Scenario: Newest message appears first

- **WHEN** a member opens the message list
- **THEN** the most recently created message appears first

#### Scenario: Messages are filtered by status

- **WHEN** a member filters the list to completed messages
- **THEN** only completed messages are listed

#### Scenario: Search matches a subject

- **WHEN** a member searches for part of a subject
- **THEN** matching messages are listed

#### Scenario: Older messages load

- **WHEN** a member requests the next page
- **THEN** additional messages are shown without losing the selected filters

### Requirement: Transport configuration

Email delivery MUST require a configured transport and sender address. When delivery is not configured, sending MUST be rejected with a configuration error while drafts remain editable. Transport credentials MUST NOT be displayed or returned to the client.

#### Scenario: Unconfigured transport blocks sending

- **WHEN** a member sends a message while no transport is configured
- **THEN** the send is rejected with a configuration error and no recipient is attempted

#### Scenario: Credentials are never exposed

- **WHEN** any member opens the messaging pages
- **THEN** no transport credential is included in the page or action response

### Requirement: Messaging access

Only active team members SHALL view, compose, send, retry, and manage groups. Inactive users MUST be rejected by every messaging read and mutation, including Server Actions invoked directly.

#### Scenario: Active member sends

- **WHEN** an active member submits a send action
- **THEN** the send proceeds under the recipient cap and eligibility rules

#### Scenario: Inactive member is rejected

- **WHEN** an inactive user invokes a messaging action
- **THEN** the action is rejected and no recipient is attempted
