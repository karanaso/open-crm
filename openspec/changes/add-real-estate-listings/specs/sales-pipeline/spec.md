# Spec Delta

## MODIFIED Requirements

### Requirement: Deal creation and editing

The system SHALL let active team members create and edit deals with a required name, buyer or tenant contact, pipeline, stage, owner, one-time commission amount, and currency, plus optional company, listing, negotiated property price, expected close date, and description. The stage MUST belong to the selected pipeline. When both a company and a contact are set, the contact MUST belong to the company. A listing-linked deal MUST default its currency, property price, and commission from the listing; standalone deals MUST use the workspace default currency, and members MAY override the snapshotted price and commission. Commission and property price MUST be zero or greater with at most two decimals and MUST use the deal currency. The owner MUST be an active team member and defaults to the creator.

#### Scenario: Deal is created

- **WHEN** a member submits a deal name, buyer contact, commission, pipeline, and stage
- **THEN** the system saves the deal with the creator as owner and shows it on the board

#### Scenario: Individual buyer has no company

- **WHEN** a member creates a deal for a buyer contact who has no company
- **THEN** the system saves the deal with the contact and no company

#### Scenario: Contact from another company is rejected

- **WHEN** a member selects a company and a contact who does not belong to it
- **THEN** the system rejects the deal and asks for a matching contact

#### Scenario: Stage from another pipeline is rejected

- **WHEN** a member submits a stage that does not belong to the selected pipeline
- **THEN** the system rejects the deal and explains the mismatch

#### Scenario: Listing defaults are applied

- **WHEN** a member creates a deal from a listing
- **THEN** the listing currency, asking price, and commission are prefilled and can be changed before saving

#### Scenario: Negative amount is rejected

- **WHEN** a member submits a commission below zero or with more than two decimals
- **THEN** the system rejects the commission

#### Scenario: Inactive owner is rejected

- **WHEN** a member assigns a deal to a deactivated user
- **THEN** the system rejects the owner selection

### Requirement: Pipeline board

The deal board MUST show one column per stage in position order, with cards showing deal name, buyer contact, company when present, commission with currency, owner, and expected close date. Active team members MUST be able to move a deal to another stage by drag-and-drop and by an accessible keyboard control. Each move MUST persist the new stage and MUST record an activity containing the previous stage, the new stage, and the acting member.

#### Scenario: Board columns follow stage order

- **WHEN** a member opens the board for a pipeline
- **THEN** columns appear in the configured stage order

#### Scenario: Deal is moved

- **WHEN** a member drags a deal from Qualified to Proposal
- **THEN** the deal is saved in Proposal and a stage-change activity is added to its timeline

#### Scenario: Keyboard move is supported

- **WHEN** a member focuses a deal card and uses the move control to select another stage
- **THEN** the deal moves to the selected stage without a pointer drag

#### Scenario: Individual buyer card is shown

- **WHEN** a deal has a contact and no company
- **THEN** its card shows the contact and does not show an empty company placeholder

#### Scenario: Empty stage is shown

- **WHEN** a stage has no deals
- **THEN** its column remains visible with a zero count

### Requirement: Deal detail

The deal detail page MUST show all deal fields, the buyer contact, the company when present, the listing when present, the property price and commission with currency, the owner, the current pipeline and stage, the activity timeline, and linked tasks. It MUST allow stage changes under the same rules as the board.

#### Scenario: Deal detail shows related information

- **WHEN** a member opens a deal
- **THEN** the page shows its contact, company or individual state, listing or standalone state, owner, stage, timeline, and tasks

#### Scenario: Stage is changed from detail

- **WHEN** a member changes the stage on the deal detail page
- **THEN** the change follows the board rules and records a stage-change activity

#### Scenario: Archived company remains linked

- **WHEN** a deal belongs to a company that was archived
- **THEN** the deal detail still shows the company with an archived indicator

#### Scenario: Listing-linked deal shows the property

- **WHEN** a deal is linked to a listing
- **THEN** the detail page links to the listing and shows the snapshotted property price and commission

### Requirement: Pipeline metrics

The pipeline board MUST display the number and total commission of open deals per stage, the total open commission, and the weighted open commission calculated from each stage's probability. Money metrics MUST be grouped by currency and MUST NOT be summed across currencies. Counts and win rate MAY remain aggregate across currencies. Metrics MUST update after a deal is created, moved, edited, or archived.

#### Scenario: Per-stage metrics are shown

- **WHEN** a member opens a pipeline with deals in several stages
- **THEN** each stage shows its open deal count and total commission in each currency

#### Scenario: Weighted value is calculated

- **WHEN** a stage with a 50 percent probability contains a 10,000 commission deal
- **THEN** the pipeline weighted commission includes 5,000 from that deal

#### Scenario: Currencies are not summed

- **WHEN** a pipeline contains open deals in EUR and USD
- **THEN** the board shows separate EUR and USD commission totals

#### Scenario: Metrics update after a move

- **WHEN** a member moves a deal to another stage
- **THEN** the affected stage counts and commission totals update without a manual refresh

### Requirement: Deal filtering and search

The deal list MUST support filtering by pipeline, stage, status, owner, currency, and expected close date range, plus text search by deal name, contact name, or company name. Results MUST be sortable by commission and expected close date and MUST be paginated. Selected filters MUST be preserved in the page URL.

#### Scenario: Deals are filtered

- **WHEN** a member filters deals by owner, currency, and open status
- **THEN** only open deals owned by that member in that currency are listed

#### Scenario: Search matches a contact

- **WHEN** a member searches deals for an individual buyer's name
- **THEN** deals belonging to that contact are listed

#### Scenario: Search matches a company

- **WHEN** a member searches deals for a company name
- **THEN** deals belonging to matching companies are listed

#### Scenario: Results are sorted

- **WHEN** a member sorts by commission descending within a currency
- **THEN** the highest-commission deal appears first

#### Scenario: Filters survive pagination

- **WHEN** a member moves to another page of a filtered deal list
- **THEN** the same filters and sort order remain applied
