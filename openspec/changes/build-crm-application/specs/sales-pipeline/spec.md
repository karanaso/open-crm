# Spec Delta

## Purpose

Manage sales opportunities through configurable pipelines and stages, and report on the value and health of the open pipeline.

## ADDED Requirements

### Requirement: Pipeline configuration

Administrators MUST be able to create, rename, reorder, and archive pipelines and stages. Each pipeline MUST have a name, exactly one default flag across all pipelines, and at least one open, one won, and one lost stage. Stages MUST have a name, position, probability from 0 to 100, and an outcome of open, won, or lost. Stages or pipelines that contain deals MUST NOT be removed or archived.

#### Scenario: Pipeline is created

- **WHEN** an administrator creates a pipeline with open, won, and lost stages
- **THEN** the pipeline is available for new deals and its stages appear in the configured order

#### Scenario: Pipeline without every outcome is rejected

- **WHEN** an administrator saves a pipeline that has no lost stage
- **THEN** the system rejects it and explains that each outcome is required

#### Scenario: Occupied stage cannot be removed

- **WHEN** an administrator tries to remove a stage that contains deals
- **THEN** the system rejects the removal until those deals are moved

#### Scenario: Stage order is changed

- **WHEN** an administrator moves a stage to a new position
- **THEN** the pipeline board and deal forms use the new order

### Requirement: Default pipeline

The system MUST provide a default pipeline named "Sales Pipeline" with stages Lead, Qualified, Proposal, Negotiation, Won, and Lost. The default pipeline MUST be seeded before first use, MUST be preselected for new deals, and MUST NOT be archived. Administrators MUST be able to choose a different default pipeline.

#### Scenario: Default pipeline is available

- **WHEN** the application is used for the first time
- **THEN** the Sales Pipeline exists with its six stages in order

#### Scenario: Default pipeline is preselected

- **WHEN** a member opens the new-deal form
- **THEN** the Sales Pipeline is selected unless the member chooses another pipeline

#### Scenario: Default is changed

- **WHEN** an administrator marks another pipeline as default
- **THEN** exactly one pipeline remains default and new deals preselect the new one

#### Scenario: Default pipeline cannot be archived

- **WHEN** an administrator tries to archive the default pipeline
- **THEN** the system rejects the change

### Requirement: Deal creation and editing

The system SHALL let active team members create and edit deals with a required name, company, pipeline, stage, owner, and amount, plus optional primary contact, expected close date, and description. The stage MUST belong to the selected pipeline. A primary contact MUST belong to the selected company. Amount MUST be zero or greater with at most two decimals and MUST be denominated in USD. The owner MUST be an active team member and defaults to the creator.

#### Scenario: Deal is created

- **WHEN** a member submits a deal name, company, amount, pipeline, and stage
- **THEN** the system saves the deal with the creator as owner and shows it on the board

#### Scenario: Stage from another pipeline is rejected

- **WHEN** a member submits a stage that does not belong to the selected pipeline
- **THEN** the system rejects the deal and explains the mismatch

#### Scenario: Contact from another company is rejected

- **WHEN** a member selects a primary contact who does not belong to the selected company
- **THEN** the system rejects the deal and asks for a matching contact

#### Scenario: Negative amount is rejected

- **WHEN** a member submits an amount below zero or with more than two decimals
- **THEN** the system rejects the amount

#### Scenario: Inactive owner is rejected

- **WHEN** a member assigns a deal to a deactivated user
- **THEN** the system rejects the owner selection

### Requirement: Pipeline board

The deal board MUST show one column per stage in position order, with cards showing deal name, company, amount, owner, and expected close date. Active team members MUST be able to move a deal to another stage by drag-and-drop and by an accessible keyboard control. Each move MUST persist the new stage and MUST record an activity containing the previous stage, the new stage, and the acting member.

#### Scenario: Board columns follow stage order

- **WHEN** a member opens the board for a pipeline
- **THEN** columns appear in the configured stage order

#### Scenario: Deal is moved

- **WHEN** a member drags a deal from Qualified to Proposal
- **THEN** the deal is saved in Proposal and a stage-change activity is added to its timeline

#### Scenario: Keyboard move is supported

- **WHEN** a member focuses a deal card and uses the move control to select another stage
- **THEN** the deal moves to the selected stage without a pointer drag

#### Scenario: Empty stage is shown

- **WHEN** a stage has no deals
- **THEN** its column remains visible with a zero count

### Requirement: Win and loss lifecycle

Moving a deal to a won or lost stage MUST set its status to won or lost and record the closed time. Moving a deal to a lost stage MUST require a lost reason. Moving a deal back to an open stage MUST clear the closed time and lost reason. Deal status MUST be derived from the stage outcome and MUST NOT be set independently.

#### Scenario: Deal is won

- **WHEN** a member moves a deal to a won stage
- **THEN** the deal status becomes won and the closed time is recorded

#### Scenario: Lost reason is required

- **WHEN** a member moves a deal to a lost stage without a reason
- **THEN** the system rejects the move and asks for a reason

#### Scenario: Deal is reopened

- **WHEN** a member moves a won deal back to an open stage
- **THEN** its status returns to open and its closed time and lost reason are cleared

#### Scenario: Status cannot be edited directly

- **WHEN** a member attempts to set a deal's status without changing its stage
- **THEN** the system ignores the status field and keeps status derived from the stage

### Requirement: Deal detail

The deal detail page MUST show all deal fields, links to the company, primary contact, and owner, the current pipeline and stage, the activity timeline, and linked tasks. It MUST allow stage changes under the same rules as the board.

#### Scenario: Deal detail shows related information

- **WHEN** a member opens a deal
- **THEN** the page shows its company, contact, owner, stage, timeline, and tasks

#### Scenario: Stage is changed from detail

- **WHEN** a member changes the stage on the deal detail page
- **THEN** the change follows the board rules and records a stage-change activity

#### Scenario: Archived company remains linked

- **WHEN** a deal belongs to a company that was archived
- **THEN** the deal detail still shows the company with an archived indicator

### Requirement: Pipeline metrics

The pipeline board MUST display the number and total amount of open deals per stage, the total open deal count and value, and the weighted open value calculated from each stage's probability. Metrics MUST update after a deal is created, moved, edited, or archived.

#### Scenario: Per-stage metrics are shown

- **WHEN** a member opens a pipeline with deals in several stages
- **THEN** each stage shows its open deal count and total amount

#### Scenario: Weighted value is calculated

- **WHEN** a stage with a 50 percent probability contains a 10,000 deal
- **THEN** the pipeline weighted value includes 5,000 from that deal

#### Scenario: Metrics update after a move

- **WHEN** a member moves a deal to another stage
- **THEN** the affected stage counts and values update without a manual refresh

### Requirement: Deal filtering and search

The deal list MUST support filtering by pipeline, stage, status, owner, and expected close date range, plus text search by deal name or company name. Results MUST be sortable by amount and expected close date and MUST be paginated. Selected filters MUST be preserved in the page URL.

#### Scenario: Deals are filtered

- **WHEN** a member filters deals by owner and open status
- **THEN** only open deals owned by that member are listed

#### Scenario: Search matches a company

- **WHEN** a member searches deals for a company name
- **THEN** deals belonging to matching companies are listed

#### Scenario: Results are sorted

- **WHEN** a member sorts by amount descending
- **THEN** the highest-value deal appears first

#### Scenario: Filters survive pagination

- **WHEN** a member moves to another page of a filtered deal list
- **THEN** the same filters and sort order remain applied
