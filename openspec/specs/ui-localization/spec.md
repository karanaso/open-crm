# ui-localization Specification

## Purpose

Lets members use the CRM in English or Greek, with consistent formatting, labels, and messages while preserving stored data and domain rules.

## Requirements

### Requirement: Supported locales and fallback

The interface SHALL support English (`en`) and Greek (`el`). English MUST be the default when no preference is stored. An unsupported or missing locale MUST fall back to English without blocking access.

#### Scenario: Default locale is English

- **WHEN** a visitor has no stored locale preference
- **THEN** the interface is shown in English

#### Scenario: Greek is available

- **WHEN** a user selects Greek
- **THEN** the interface is shown in Greek

#### Scenario: Unsupported locale falls back

- **WHEN** the stored locale is not `en` or `el`
- **THEN** the interface falls back to English

### Requirement: Locale resolution and persistence

A signed-in user's locale preference MUST be stored on their profile. The interface MUST use the synchronized locale cookie, set from the profile at sign-in and whenever the preference changes. Unauthenticated pages MUST resolve the locale from the locale cookie, then the browser preference, then English. Changing the language MUST update the profile and cookie and apply without signing out. Signing in on a new device MUST apply the profile locale.

#### Scenario: Language change applies immediately

- **WHEN** a signed-in user changes their language
- **THEN** the interface switches without signing out and keeps the choice after reload

#### Scenario: New device uses the profile locale

- **WHEN** a user with a Greek profile preference signs in on a different browser
- **THEN** the interface opens in Greek

#### Scenario: Auth page uses the cookie

- **WHEN** an unauthenticated visitor opens the sign-in page after choosing Greek
- **THEN** the sign-in page is shown in Greek

#### Scenario: Missing preference falls back

- **WHEN** no cookie or profile preference exists
- **THEN** the interface uses English

### Requirement: Message catalog coverage

All user-facing interface text MUST come from locale catalogs. English and Greek catalogs MUST share the same keys and placeholders. The catalog check MUST fail on missing keys, empty values, or placeholder mismatches. A missing key at runtime MUST fall back to English and MUST NOT show a raw key identifier. The product name and user-entered content MUST NOT be translated.

#### Scenario: Catalogs share a key set

- **WHEN** the catalog check runs
- **THEN** every English key exists in Greek and every Greek key exists in English

#### Scenario: Placeholder mismatch fails

- **WHEN** a translated message omits or renames a placeholder from its English source
- **THEN** the catalog check fails and reports the key

#### Scenario: Missing key falls back

- **WHEN** a Greek message is missing at runtime
- **THEN** the English message is shown instead of the key identifier

#### Scenario: User content is not translated

- **WHEN** the interface displays a company name, contact name, tag, stage name, note, or campaign copy
- **THEN** the stored text is shown exactly as entered

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

### Requirement: Locale-independent error contract

Domain services and Server Actions MUST return locale-independent error codes and parameters. They MUST NOT return display strings as the contract for user-facing errors. The interface MUST translate codes into the active locale. Unknown errors MUST produce a generic localized message and MUST NOT expose internal details.

#### Scenario: Service code is translated

- **WHEN** a Greek user triggers a service error
- **THEN** the interface shows the Greek message for that error code

#### Scenario: Unknown error is generic

- **WHEN** an unexpected error occurs
- **THEN** the interface shows a generic Greek message and logs the diagnostic without exposing it

#### Scenario: English locale uses English messages

- **WHEN** the active locale is English and a service error occurs
- **THEN** the interface shows the English message for that error code

#### Scenario: Raw service text is not displayed

- **WHEN** a service returns an error code with diagnostic text
- **THEN** the diagnostic text is not rendered to the user

### Requirement: Localized validation feedback

Validation failures MUST be presented as field-level messages in the active locale. The same validation result MUST be translatable into both locales without changing the validation rules. Server-side validation MUST remain authoritative.

#### Scenario: Greek field error

- **WHEN** a Greek user submits a form with an invalid required field
- **THEN** the field shows a Greek validation message

#### Scenario: Rules are locale-independent

- **WHEN** the same invalid input is submitted in English and Greek
- **THEN** the same fields are rejected and only the message language changes

#### Scenario: Server validation remains authoritative

- **WHEN** a client bypasses browser validation and submits invalid input
- **THEN** the Server Action rejects it and returns localized field errors

### Requirement: Document language and accessible names

The document MUST declare the active locale in the `lang` attribute. Page titles, descriptions, aria-labels, and accessible names MUST be localized. Changing the language MUST update the document language and accessible names.

#### Scenario: Greek document language

- **WHEN** a page is rendered in Greek
- **THEN** the root document declares `lang="el"`

#### Scenario: Accessible names are localized

- **WHEN** a Greek user navigates with a screen reader
- **THEN** navigation labels and control names are announced in Greek

#### Scenario: Metadata is localized

- **WHEN** a Greek page is rendered
- **THEN** its title and description use Greek text

### Requirement: Translator workflow and catalog quality

The project MUST maintain a Greek glossary and style guide. Translation MUST preserve keys, placeholders, ICU syntax, and code identifiers; it MUST NOT translate user data or product names. Catalog checks MUST run in the verification suite, and translations MUST be produced locally without sending private strings to external services.

#### Scenario: Glossary is used consistently

- **WHEN** a term exists in the glossary
- **THEN** the Greek catalog uses that term consistently

#### Scenario: Placeholder mismatch is rejected

- **WHEN** a translation changes a placeholder or ICU expression
- **THEN** the catalog check fails before merge

#### Scenario: Missing translations are reported

- **WHEN** the Greek catalog is incomplete
- **THEN** the catalog check reports each missing key

#### Scenario: Private strings stay local

- **WHEN** translation work is performed
- **THEN** no application strings are sent to an external translation service

### Requirement: Localized error boundary

The root error boundary SHALL show a generic message and a retry action in the active locale. It MUST NOT render the underlying error message, stack trace, digest, or other internal identifiers. It MUST log the diagnostic for operators. All copy MUST come from the locale catalogs.

#### Scenario: Greek error boundary

- **WHEN** a Greek user encounters an unexpected page error
- **THEN** the page shows the Greek generic error message and retry action

#### Scenario: English error boundary

- **WHEN** an English user encounters an unexpected page error
- **THEN** the page shows the English generic error message and retry action

#### Scenario: Diagnostic is not rendered

- **WHEN** the underlying error contains a raw message, stack trace, or digest
- **THEN** none of those details are visible in the page

#### Scenario: Retry action

- **WHEN** the user selects the retry action
- **THEN** the boundary attempts to render the page again

#### Scenario: Diagnostic is logged

- **WHEN** an unexpected page error occurs
- **THEN** the diagnostic is logged for operators without being shown to the user

### Requirement: Localized not-found page

The not-found page SHALL show a localized title, description, and a link back to the dashboard in the active locale. It MUST use the normal document shell so the active `lang` attribute and accessible names are preserved.

#### Scenario: Greek not-found page

- **WHEN** a Greek user opens a page or record that does not exist
- **THEN** the page shows Greek copy and a Greek dashboard link

#### Scenario: English not-found page

- **WHEN** an English user opens a page or record that does not exist
- **THEN** the page shows English copy and an English dashboard link

#### Scenario: Back to dashboard

- **WHEN** the user selects the dashboard link on the not-found page
- **THEN** the dashboard opens

#### Scenario: Missing record

- **WHEN** a Greek user requests a missing company or contact
- **THEN** the localized not-found page is shown instead of an empty page

### Requirement: Root-layout error fallback

A failure above the normal locale provider SHALL render a self-contained document with the resolved locale in `<html lang>`, a generic localized message, and a retry action. It MUST resolve the locale from the locale cookie, then the browser preference, then English, without relying on `NextIntlClientProvider`.

#### Scenario: Greek locale cookie

- **WHEN** the root layout fails and the locale cookie is `el`
- **THEN** the fallback renders Greek copy and `<html lang="el">`

#### Scenario: Browser preference only

- **WHEN** the root layout fails, no locale cookie exists, and the browser preference is Greek
- **THEN** the fallback renders Greek copy

#### Scenario: Missing or unsupported preference

- **WHEN** the root layout fails and no supported locale is available
- **THEN** the fallback renders English copy

#### Scenario: Self-contained document

- **WHEN** the root layout fails before the normal provider mounts
- **THEN** the fallback still renders a complete document with `<html>` and `<body>`

#### Scenario: Retry action

- **WHEN** the user selects the retry action in the fallback
- **THEN** the application attempts to render again

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
