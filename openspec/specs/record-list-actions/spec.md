# record-list-actions Specification

## Purpose

Provide a consistent, direct way to open the edit form of a record from the list grids where members already browse it.

## Requirements

### Requirement: Record list edit actions

Every record list grid for companies, contacts, listings, deals in list view, tickets, campaigns, and segments SHALL show a rightmost actions column. Each row MUST expose one icon-only action that opens that record's existing edit page. The record title MUST continue to open the detail page. Message lists, message-group lists, the deals board, nested related-record tables, task rows, and settings tables are out of scope because they have no separate edit page or already expose an edit action.

#### Scenario: Company row opens its edit page

- **WHEN** a member activates the edit action on a company row
- **THEN** the company's edit page opens

#### Scenario: Contact row opens its edit page

- **WHEN** a member activates the edit action on a contact row
- **THEN** the contact's edit page opens

#### Scenario: Listing row opens its edit page

- **WHEN** a member activates the edit action on a listing row
- **THEN** the listing's edit page opens

#### Scenario: Deal list row opens its edit page

- **WHEN** a member activates the edit action on a deal row in list view
- **THEN** the deal's edit page opens

#### Scenario: Ticket row opens its edit page

- **WHEN** a member activates the edit action on a ticket row
- **THEN** the ticket's edit page opens

#### Scenario: Marketing rows open their edit pages

- **WHEN** a member activates the edit action on a campaign or segment row
- **THEN** that campaign or segment's edit page opens

#### Scenario: Deals board is unchanged

- **WHEN** a member views deals on the board
- **THEN** no row edit action is added to the board cards

#### Scenario: Message list is unchanged

- **WHEN** a member views the message list
- **THEN** the list does not show a row edit action

### Requirement: Edit action accessibility

The icon-only edit action MUST have a localized accessible name that identifies the record, for example "Edit Acme Software". It MUST be reachable and operable by keyboard, and the actions column MUST expose a localized "Actions" header to assistive technology. The pencil icon MUST be hidden from assistive technology so the link is announced once.

#### Scenario: Accessible name identifies the record

- **WHEN** a screen reader focuses the edit action on a company named Acme Software
- **THEN** the action is announced as "Edit Acme Software" in English or its Greek equivalent in the Greek interface

#### Scenario: Keyboard reaches the edit action

- **WHEN** a member tabs through a record list row
- **THEN** the edit action receives focus and can be activated from the keyboard

#### Scenario: Actions column is announced

- **WHEN** a screen reader reads the record list table header
- **THEN** the last column is announced as "Actions" in the active locale
