# Proposal

## Why

The global error and not-found pages were outside the localization pass. `src/app/error.tsx` renders English copy and the raw `error.message`, which violates the `ui-localization` error contract and can expose internal details. `src/app/not-found.tsx` is English-only, and there is no fallback for failures above the normal locale provider.

## What Changes

- Localize `src/app/error.tsx` and `src/app/not-found.tsx` into English and Greek using the existing catalogs.
- Replace the raw error message in the error boundary with a generic localized message and a retry action. Log the diagnostic for operators instead of rendering it.
- Add `src/app/global-error.tsx` for failures above the normal provider. It renders a self-contained document with `<html lang>`, resolves the locale from the locale cookie, then the browser preference, then English, and shows localized generic copy plus a retry action.
- Make the non-sensitive `opencrm_locale` cookie readable by the root-layout fallback; keep `sameSite=lax` and `secure` in production. Authentication and session cookies are unchanged.
- Add `errorPages` catalog keys, component tests for all three surfaces, Greek/English 404 E2E coverage, and an accessibility check for the not-found page.

Out of scope: changing the normal error/validation descriptor contract, adding an error-reporting service, adding a test-only error route, or changing the visual design.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-localization`: add requirements for localized error and not-found pages, the root-layout fallback, document language, and the no-diagnostics rule.

## Impact

- Touches `src/app/error.tsx`, `src/app/not-found.tsx`, new `src/app/global-error.tsx`, `src/i18n/cookie.ts`, `messages/en.json`, `messages/el.json`, and tests.
- No database, API, or dependency changes.
- The locale cookie remains a non-sensitive preference. Removing `httpOnly` only allows client code to read `en`/`el` for the root-layout fallback.
