# Spec Delta

## ADDED Requirements

### Requirement: Workspace currency and display time zone

Administrators MUST be able to set a workspace default currency and display time zone. New money-bearing records without an explicit currency MUST use the workspace default. Listings and deals MUST be able to carry their own currency. Displayed dates and times MUST use the workspace time zone while storage and SLA calculations remain in UTC. Invalid currency or time zone values MUST be rejected. The system MUST NOT convert amounts between currencies.

#### Scenario: Workspace defaults are applied

- **WHEN** an administrator sets EUR and Europe/Athens as the workspace defaults
- **THEN** new records without an explicit currency use EUR and displayed timestamps use the Athens time zone

#### Scenario: Record currency overrides the default

- **WHEN** a listing is saved in USD while the workspace default is EUR
- **THEN** the listing price is formatted in USD

#### Scenario: Invalid time zone is rejected

- **WHEN** an administrator saves an unsupported time zone
- **THEN** the system rejects the setting

#### Scenario: Amounts are not converted

- **WHEN** records in EUR and USD are displayed together
- **THEN** each amount keeps its own currency and no converted total is produced

### Requirement: Localized listing vocabulary

All listing interface text, including transaction, status, property type, viewing status, feature group names, and feature labels, MUST come from the locale catalogs. Stored listing identifiers and user-entered listing content MUST remain unchanged. The Greek glossary MUST define the approved terms for listing, commission, seller or landlord, viewing, and feature groups.

#### Scenario: Feature label is localized

- **WHEN** a Greek user opens a listing feature group
- **THEN** the group and feature names are shown in Greek

#### Scenario: Stored listing values are unchanged

- **WHEN** a user switches language
- **THEN** listing references, titles, descriptions, addresses, and stored feature keys are unchanged

#### Scenario: Glossary term is used

- **WHEN** the Greek interface shows a commission
- **THEN** it uses the approved glossary term rather than an untranslated or synonym label

## MODIFIED Requirements

### Requirement: Locale-aware formatting

Dates, times, numbers, amounts, and durations MUST be formatted for the active locale. Dates and times MUST be displayed in the workspace display time zone, while storage and SLA calculations MUST remain in UTC. Amounts MUST be formatted in the currency of the record; records without an explicit currency MUST use the workspace default. Formatting MUST NOT change stored values.

#### Scenario: Greek date formatting

- **WHEN** a Greek user views a timestamp
- **THEN** the date and time use Greek formatting and the workspace time zone while the underlying instant is unchanged

#### Scenario: Record currency is preserved

- **WHEN** a Greek user views a EUR listing and a USD deal
- **THEN** each amount is formatted for Greek conventions in its own currency

#### Scenario: USD remains USD

- **WHEN** a Greek user views a deal stored in USD
- **THEN** the amount is formatted for Greek conventions and its currency remains USD

#### Scenario: Duration units are localized

- **WHEN** a Greek user views an SLA duration
- **THEN** the duration uses Greek unit labels

#### Scenario: Stored values are unchanged

- **WHEN** a user switches language or time zone
- **THEN** stored timestamps and amounts are unchanged

### Requirement: Localized domain labels

Stored enum identifiers MUST remain unchanged. The interface MUST show localized labels for roles, ticket statuses and priorities, deal statuses and stage outcomes, task priorities and statuses, activity types, campaign channels and statuses, recipient statuses, listing transactions and statuses, viewing statuses, and property types. User-entered values MUST remain exactly as entered.

#### Scenario: Ticket status label is localized

- **WHEN** a Greek user views a ticket whose stored status is `in_progress`
- **THEN** the interface shows the Greek label and the stored value remains `in_progress`

#### Scenario: Listing status label is localized

- **WHEN** a Greek user views a listing whose stored status is `inactive`
- **THEN** the interface shows the Greek label and the stored value remains `inactive`

#### Scenario: Custom stage name is not translated

- **WHEN** a Greek user views a pipeline stage named by an administrator
- **THEN** the stage name is shown exactly as entered

#### Scenario: Role label is localized

- **WHEN** a Greek user views a team member with the stored role `admin`
- **THEN** the interface shows the Greek label for administrator
