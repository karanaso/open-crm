# Spec Delta

## ADDED Requirements

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
