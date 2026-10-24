# Spec Delta

## ADDED Requirements

### Requirement: Relationship-based contact roles

Contacts MUST NOT store a buyer or seller role. The same contact MAY be the seller on one or more listings and the buyer or tenant on one or more deals. Removing one relationship MUST NOT remove the contact or any other relationship. Directory views MUST derive selling and buying roles from those relationships.

#### Scenario: Contact is both buyer and seller

- **WHEN** a contact is the seller on one listing and the buyer on a deal for another listing
- **THEN** the contact detail shows both relationships without changing a role field

#### Scenario: Removing one relationship leaves the other

- **WHEN** a deal where the contact was the buyer is removed from the contact's view
- **THEN** the contact remains the seller on their listing

#### Scenario: No buyer or seller filter field

- **WHEN** a member creates or edits a contact
- **THEN** the form does not offer a stored buyer or seller role

## MODIFIED Requirements

### Requirement: Record archiving

The system SHALL archive companies and contacts instead of permanently deleting them. Archived records MUST remain visible from existing deals, tickets, activities, and listings where they are the seller or buyer, but MUST NOT appear in pickers for new records or in default directory lists. Active team members MUST be able to restore archived records.

#### Scenario: Archived company disappears from pickers

- **WHEN** a company is archived and a member opens the company picker for a new contact
- **THEN** the archived company is not offered as a choice

#### Scenario: Archived record remains on related records

- **WHEN** a company is archived while a deal still references it
- **THEN** the deal detail page still shows the archived company with an archived indicator

#### Scenario: Archived seller remains on a listing

- **WHEN** a contact who is the seller of a listing is archived
- **THEN** the listing detail still shows the seller with an archived indicator

#### Scenario: Archived record is restored

- **WHEN** a member restores an archived contact
- **THEN** the contact reappears in the default directory list and new-record pickers

### Requirement: Company and contact relationships

A company detail page MUST show its contacts, listings where it is the seller, deals, tickets, and combined activity and task timeline. A contact detail page MUST show its company, deals where it is the buyer, listings where it is the seller, viewings, tickets, campaign memberships, and combined activity and task timeline. Each related item MUST link to its own detail page.

#### Scenario: Company shows related records

- **WHEN** a member opens a company that has contacts, listings, deals, and tickets
- **THEN** the page lists those records and links to each one

#### Scenario: Contact shows selling and buying

- **WHEN** a member opens a contact who sells one listing and buys on another
- **THEN** the page shows separate selling and buying sections

#### Scenario: Contact shows campaign memberships

- **WHEN** a contact was included in an activated campaign
- **THEN** the contact detail page lists that campaign and its engagement status

#### Scenario: Contact shows viewings

- **WHEN** a contact has scheduled viewings
- **THEN** the contact detail page lists them

#### Scenario: Related timeline is visible

- **WHEN** a company or contact has activities and tasks linked to it
- **THEN** the detail page shows them in the combined timeline
