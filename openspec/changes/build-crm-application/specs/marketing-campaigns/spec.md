# Spec Delta

## Purpose

Organize contacts into targeted segments and track campaign outreach and responses while leaving message delivery to external tools.

## ADDED Requirements

### Requirement: Segment management

The system SHALL let active team members create, edit, and archive segments with a name, optional description, and filter criteria. Supported criteria MUST include contact tags, company industry, job title text, owner, and contact creation date range. Criteria MUST combine with AND across fields and OR within a tag list. A segment MUST require at least one criterion and MUST show its current matching-contact count.

#### Scenario: Segment is created

- **WHEN** a member creates a segment for contacts tagged `vip` in the software industry
- **THEN** the system saves the segment and shows the count of matching contacts

#### Scenario: Count reflects current data

- **WHEN** a new matching contact is created
- **THEN** the segment count increases the next time the segment is viewed

#### Scenario: Empty criteria are rejected

- **WHEN** a member saves a segment with no criteria
- **THEN** the system rejects it and asks for at least one criterion

#### Scenario: Tag criteria use OR

- **WHEN** a segment selects tags `vip` and `renewal`
- **THEN** contacts with either tag are included

#### Scenario: Segment is archived

- **WHEN** a member archives a segment
- **THEN** it disappears from the segment picker for new campaigns while existing campaigns retain their snapshot

### Requirement: Segment evaluation

Segment membership MUST be evaluated from current active-contact data whenever the segment is viewed or used to activate a campaign. Archived contacts MUST be excluded. A contact MUST match only when it satisfies every configured field criterion.

#### Scenario: Archived contact is excluded

- **WHEN** a matching contact is archived
- **THEN** the contact is removed from the segment's current count and audience

#### Scenario: All field criteria must match

- **WHEN** a segment requires the software industry and the title `Director`
- **THEN** a contact matches only when both conditions are true

#### Scenario: Company industry uses the current company

- **WHEN** a contact's company industry changes to match a segment
- **THEN** the contact is included the next time the segment is evaluated

### Requirement: Campaign management

The system SHALL let active team members create and edit campaigns with a required name, channel, segment, and owner, plus optional budget, start date, end date, and description. Channel MUST be email, phone, event, social, or other. End date MUST NOT precede start date, and budget MUST be zero or greater in USD. New campaigns MUST start in draft status with the creator as owner.

#### Scenario: Campaign is created

- **WHEN** a member submits a campaign name, channel, and segment
- **THEN** the system saves a draft campaign with the creator as owner

#### Scenario: Invalid date range is rejected

- **WHEN** a campaign end date is before its start date
- **THEN** the system rejects the campaign and shows a date error

#### Scenario: Negative budget is rejected

- **WHEN** a campaign budget is below zero
- **THEN** the system rejects the budget

#### Scenario: Channel must be supported

- **WHEN** a campaign is submitted with an unsupported channel
- **THEN** the system rejects the campaign

### Requirement: Campaign lifecycle

Campaigns MUST support draft, active, completed, and archived statuses. Draft campaigns MAY move to active or archived. Active campaigns MAY move to completed or archived. Completed campaigns MAY move to archived. Archived campaigns MUST be read-only. Activation MUST require a segment with at least one matching active contact.

#### Scenario: Campaign is activated

- **WHEN** a member activates a draft campaign whose segment has matching contacts
- **THEN** the campaign becomes active and its audience snapshot is created

#### Scenario: Empty segment blocks activation

- **WHEN** a member activates a campaign whose segment has no matching contacts
- **THEN** the system rejects activation and explains that the audience is empty

#### Scenario: Campaign is completed

- **WHEN** an active campaign is marked completed
- **THEN** it stops appearing among active campaigns and its metrics remain available

#### Scenario: Archived campaign is read-only

- **WHEN** a member opens an archived campaign
- **THEN** campaign fields, audience, and engagement statuses cannot be changed

### Requirement: Audience snapshot

Activating a campaign MUST create a recipient for every contact currently matching the campaign segment, each with status targeted. Later changes to the segment, its criteria, or matching contact data MUST NOT add or remove recipients. The campaign MUST retain the segment name and criteria used at activation.

#### Scenario: Segment changes do not alter the audience

- **WHEN** a segment is edited after a campaign is activated
- **THEN** the campaign recipient list remains unchanged

#### Scenario: New matching contact is not added

- **WHEN** a contact starts matching the segment after activation
- **THEN** the contact is not added to the campaign

#### Scenario: Segment snapshot is retained

- **WHEN** the source segment is later renamed or archived
- **THEN** the campaign still shows the segment name and criteria used at activation

#### Scenario: Empty audience creates no recipients

- **WHEN** activation is attempted with an empty audience
- **THEN** no campaign recipients are created

### Requirement: Engagement tracking

Each campaign recipient MUST have an engagement status of targeted, sent, opened, clicked, responded, or converted. Active team members MUST be able to update a recipient's status, and each change MUST record the update time. Campaign summaries MUST count recipients by their current status.

#### Scenario: Recipient is marked sent

- **WHEN** a member changes a targeted recipient to sent
- **THEN** the recipient shows sent and the targeted count decreases by one

#### Scenario: Recipient responds

- **WHEN** a member marks a recipient as responded
- **THEN** the campaign response count includes that recipient

#### Scenario: Status is corrected

- **WHEN** a member changes a converted recipient back to responded
- **THEN** the conversion count decreases and the response count includes the recipient

#### Scenario: Update time is recorded

- **WHEN** a recipient's status changes
- **THEN** the recipient shows the time of the latest change

### Requirement: Campaign metrics

Campaign detail MUST show audience size, counts and percentages by engagement status, response rate, and conversion rate. Response rate MUST be the number of responded or converted recipients divided by audience size. Conversion rate MUST be the number of converted recipients divided by audience size. Rates MUST be zero when the audience is empty.

#### Scenario: Metrics are calculated

- **WHEN** a campaign has 10 recipients, 3 responded, and 1 converted
- **THEN** response rate is 40 percent and conversion rate is 10 percent

#### Scenario: Empty campaign metrics

- **WHEN** a campaign has no recipients
- **THEN** audience size and all rates are shown as zero

#### Scenario: Metrics reflect current statuses

- **WHEN** a recipient status changes
- **THEN** the campaign metrics update on the next view

### Requirement: Campaign list and search

The campaign list MUST support filtering by status, channel, and owner, text search by campaign name, sorting by start date and name, and pagination. Selected filters MUST be preserved in the URL.

#### Scenario: Campaigns are filtered

- **WHEN** a member filters campaigns by active status and email channel
- **THEN** only active email campaigns are listed

#### Scenario: Search matches a campaign name

- **WHEN** a member searches for part of a campaign name
- **THEN** matching campaigns are listed

#### Scenario: Sorting is applied

- **WHEN** a member sorts campaigns by start date descending
- **THEN** the most recently started campaign appears first

### Requirement: No message delivery

The system MUST NOT send email, SMS, or social messages. Activating a campaign MUST NOT contact recipients, and every engagement status MUST be recorded manually by a team member.

#### Scenario: Activation does not send messages

- **WHEN** a member activates a campaign
- **THEN** recipients are created with targeted status and no message is delivered

#### Scenario: Engagement is manual

- **WHEN** a recipient's status changes
- **THEN** the change is attributed to the team member who recorded it
