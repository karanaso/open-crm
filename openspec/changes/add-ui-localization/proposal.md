# Proposal

## Why

The interface is English-only, but the team needs to use the CRM in Greek. Every user-facing string, date, and error is currently hardcoded in English across 37 pages and 60 components, so adding a language later would mean touching the whole application again.

## What Changes

- Add English and Greek UI localization with `next-intl` in no-routing mode. The locale lives on `users.locale` and a locale cookie; URLs do not change.
- Add a language switcher to the profile settings and the setup, sign-in, invite, and reset pages. The choice applies immediately and persists across devices for signed-in users.
- Extract user-facing strings into `messages/en.json` and `messages/el.json` with stable keys and matching placeholders.
- Localize dates, times, numbers, USD amounts, SLA durations, enum display labels, validation messages, action errors, aria-labels, and page metadata. Stored enum values, user data, USD, and UTC SLA rules do not change.
- Refactor Server Actions and domain services to return locale-independent error codes and parameters; translate them at the UI boundary. Services remain language-agnostic.
- Add catalog parity and placeholder checks, a Greek glossary and style guide, and a Greek end-to-end smoke journey.
- Add `users.locale` through a migration, defaulting existing users to English. Add the `next-intl` dependency.

Out of scope: URL-prefixed locales, right-to-left layouts, languages other than English and Greek, translating user-generated content (names, notes, pipeline stage names, tags, campaign copy), email delivery, and changing stored database enum values.

## Capabilities

### New Capabilities

- `ui-localization`: locale resolution and persistence, message catalogs, locale-aware formatting, enum display labels, error and validation translation, document accessibility metadata, and the translator workflow.

### Modified Capabilities

- `workspace-access`: add an interface-language preference to profile settings and the authentication and setup flows.

## Impact

- Adds `next-intl` and new `messages/`, `docs/i18n/`, and `src/i18n/` trees.
- Adds `users.locale` (`text`, default `en`) and one migration; existing users are backfilled to English.
- Touches the root, authenticated, and auth layouts; all pages and components with user-facing text; `src/lib/dates.ts`, `src/lib/errors.ts`, `src/lib/action-state.ts`, validation schemas, Server Actions, and navigation labels in `src/lib/constants.ts`.
- Changes the Server Action error contract from English messages to translation keys and parameters. Forms are the only consumer; the read-only search route returns data, not messages.
- Adds unit tests for catalog and formatting, integration coverage for locale persistence, and a Greek E2E journey. Existing English E2E tests remain the default-locale baseline.
- Does not change authentication, authorization, CRM domain rules, USD amounts, UTC calendar-hour SLAs, the single-workspace model, or stored data other than `users.locale`.
