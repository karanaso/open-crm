# crm-directory Specification

## Purpose

Maintain the shared companies and contacts that every sales, support, and marketing record references, with ownership, tags, relationships, and bulk import.

## Requirements

### Requirement: Company records

The system SHALL let active team members create and edit companies with a required name and optional domain, industry, employee count, phone, website, address, description, owner, and tags. Domains MUST be normalized to lowercase without a protocol or leading `www.`. Every company MUST have an owner selected from active team members, defaulting to its creator.

#### Scenario: Company is created

- **WHEN** a member submits a company name and optional details without choosing an owner
- **THEN** the system saves the company with the creator as owner and opens its detail page

#### Scenario: Domain is normalized

- **WHEN** a company is saved with `https://www.Acme.COM`
- **THEN** the stored domain is `acme.com`

#### Scenario: Required name is enforced

- **WHEN** a company is submitted without a name
- **THEN** the system rejects the submission and shows a name error

#### Scenario: Inactive owner is rejected

- **WHEN** a company is submitted with a deactivated user as owner
- **THEN** the system rejects the owner selection

### Requirement: Contact records

The system SHALL let active team members create and edit contacts with a required first name, last name, and email, plus optional phone, job title, company, owner, tags, and notes. Contact email addresses MUST be unique within the workspace when compared case-insensitively. Every contact MUST have an owner selected from active team members, defaulting to its creator.

#### Scenario: Contact is created

- **WHEN** a member submits a first name, last name, and email
- **THEN** the system saves the contact with a normalized lowercase email and the creator as owner

#### Scenario: Duplicate email is rejected

- **WHEN** a member submits an email that already belongs to another contact, ignoring case
- **THEN** the system rejects the contact and identifies the existing contact

#### Scenario: Contact can exist without a company

- **WHEN** a member creates a contact without selecting a company
- **THEN** the system saves the contact and shows it in the directory without a company link

#### Scenario: Required contact fields are enforced

- **WHEN** a contact is submitted without a first name, last name, or email
- **THEN** the system rejects the submission and shows field-level errors

### Requirement: Record archiving

The system SHALL archive companies and contacts instead of permanently deleting them. Archived records MUST remain visible from existing deals, tickets, and activities, but MUST NOT appear in pickers for new records or in default directory lists. Active team members MUST be able to restore archived records.

#### Scenario: Archived company disappears from pickers

- **WHEN** a company is archived and a member opens the company picker for a new contact
- **THEN** the archived company is not offered as a choice

#### Scenario: Archived record remains on related records

- **WHEN** a company is archived while a deal still references it
- **THEN** the deal detail page still shows the archived company with an archived indicator

#### Scenario: Archived record is restored

- **WHEN** a member restores an archived contact
- **THEN** the contact reappears in the default directory list and new-record pickers

### Requirement: Tags

The system SHALL allow free-form tags on companies and contacts. Tags MUST be trimmed, lowercased, deduplicated per record, limited to 40 characters each, and limited to 20 tags per record. Directory filters MUST match records containing any of the selected tags.

#### Scenario: Tags are normalized

- **WHEN** a member enters the tags `Enterprise`, ` enterprise `, and `VIP`
- **THEN** the record stores `enterprise` and `vip` without duplicates

#### Scenario: Tag limits are enforced

- **WHEN** a member adds a tag longer than 40 characters or a 21st tag
- **THEN** the system rejects the change and explains the limit

#### Scenario: Filter matches any selected tag

- **WHEN** a member filters contacts by `vip` and `renewal`
- **THEN** the list includes contacts with either tag

### Requirement: Company and contact relationships

A company detail page MUST show its contacts, deals, tickets, and combined activity and task timeline. A contact detail page MUST show its company, deals, tickets, campaign memberships, and combined activity and task timeline. Each related item MUST link to its own detail page.

#### Scenario: Company shows related records

- **WHEN** a member opens a company that has contacts, deals, and tickets
- **THEN** the page lists those records and links to each one

#### Scenario: Contact shows campaign memberships

- **WHEN** a contact was included in an activated campaign
- **THEN** the contact detail page lists that campaign and its engagement status

#### Scenario: Related timeline is visible

- **WHEN** a company has activities and tasks linked to it
- **THEN** the company detail page shows them in the combined timeline

### Requirement: Directory search and filtering

The directory MUST provide paginated company and contact lists. Company search MUST match name or domain; contact search MUST match name or email. Filters MUST include owner, tags, industry for companies, and company for contacts. Results MUST be limited to the workspace and the selected filters MUST be preserved in the page URL.

#### Scenario: Search matches a domain

- **WHEN** a member searches companies for `acme`
- **THEN** companies whose name or domain contains `acme` are listed

#### Scenario: Filters combine

- **WHEN** a member filters contacts by owner and tag
- **THEN** only contacts matching both filters are listed

#### Scenario: No matches

- **WHEN** a search returns no records
- **THEN** the list shows an empty state that preserves the search and filter controls

#### Scenario: Pagination preserves filters

- **WHEN** a member moves to the second page of a filtered list
- **THEN** the same filters remain applied

### Requirement: CSV import

The system SHALL import companies and contacts from CSV files up to 5 MB and 5,000 data rows. Import MUST require column mapping and show a preview before confirmation. Invalid rows MUST be skipped and reported by row number; valid rows MUST be imported. Contacts MUST deduplicate by email and companies by normalized domain when present; duplicates MUST be skipped and counted.

#### Scenario: Contact import succeeds

- **WHEN** a member uploads a valid contacts CSV, maps the required columns, and confirms
- **THEN** the system imports the valid contacts and reports the imported count

#### Scenario: Partial import reports invalid rows

- **WHEN** a CSV contains some rows with missing required fields
- **THEN** the system imports the valid rows and reports each skipped row with its row number and reason

#### Scenario: Duplicate rows are skipped

- **WHEN** a CSV contains two contacts with the same email, ignoring case
- **THEN** the first is imported and the later duplicate is skipped and counted

#### Scenario: Oversized file is rejected

- **WHEN** a member uploads a CSV larger than 5 MB or containing more than 5,000 data rows
- **THEN** the system rejects the file before importing any rows

#### Scenario: Unsupported file type is rejected

- **WHEN** a member uploads a file that is not a CSV
- **THEN** the system rejects the file and explains the accepted format

### Requirement: Owner lifecycle

When the owner of a company or contact is deactivated, the record MUST retain that owner and display the owner as inactive. Records MUST be reassignable to any active team member, and inactive users MUST NOT be selectable for new ownership assignments.

#### Scenario: Deactivated owner remains visible

- **WHEN** a contact's owner is deactivated
- **THEN** the contact still lists that owner with an inactive indicator

#### Scenario: Record is reassigned

- **WHEN** an administrator reassigns the contact to an active member
- **THEN** the new owner is shown and can be filtered on

#### Scenario: Inactive user cannot receive new records

- **WHEN** a member attempts to assign a company to a deactivated user
- **THEN** the system rejects the assignment
