# Spec Delta

## Purpose

Lets members use the CRM in English or Greek, with consistent formatting, labels, and messages while preserving stored data and domain rules.

## ADDED Requirements

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

Dates, times, numbers, USD amounts, and durations MUST be formatted for the active locale. Dates and SLA calculations MUST remain in UTC, and amounts MUST remain USD. Formatting MUST NOT change stored values.

#### Scenario: Greek date formatting

- **WHEN** a Greek user views a timestamp
- **THEN** the date and time use Greek formatting while the underlying instant is unchanged

#### Scenario: USD remains USD

- **WHEN** a Greek user views a deal amount
- **THEN** the amount is formatted for Greek conventions but its currency is still USD

#### Scenario: Duration units are localized

- **WHEN** a Greek user views an SLA duration
- **THEN** the duration uses Greek unit labels

#### Scenario: Stored values are unchanged

- **WHEN** a user switches language
- **THEN** stored timestamps and amounts are unchanged

### Requirement: Localized domain labels

Stored enum identifiers MUST remain unchanged. The interface MUST show localized labels for roles, ticket statuses and priorities, deal statuses and stage outcomes, task priorities and statuses, activity types, campaign channels and statuses, and recipient statuses. User-entered values MUST remain exactly as entered.

#### Scenario: Ticket status label is localized

- **WHEN** a Greek user views a ticket whose stored status is `in_progress`
- **THEN** the interface shows the Greek label and the stored value remains `in_progress`

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
