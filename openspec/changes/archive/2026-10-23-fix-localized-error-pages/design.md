# Design

## Context

See `proposal.md` for motivation and `specs/ui-localization/spec.md` for the behavior contract.

Current state:

- `src/app/error.tsx` is a client component inside the root layout. It hardcodes English copy and renders `error.message`.
- `src/app/not-found.tsx` is a server component inside the root layout. It hardcodes English copy.
- There is no `src/app/global-error.tsx`, so a failure in the root layout falls back to Next.js's default error page.
- `src/app/layout.tsx` provides `NextIntlClientProvider` and `<html lang>`. Error and not-found pages can use that context; a root-layout failure cannot.
- The `opencrm_locale` cookie is currently `httpOnly`, so a client-side root-layout fallback cannot read it.
- The `ui-localization` error contract already requires generic localized errors and forbids exposing internal details.

## Goals / Non-Goals

**Goals:**

- Localize the error boundary, not-found page, and root-layout fallback in English and Greek.
- Stop rendering raw error messages, stack traces, or digests.
- Preserve the active document language and accessible names.
- Keep all copy in the existing catalogs and cover the new keys with the catalog check.
- Add focused tests for the three surfaces and the locale resolver.

**Non-Goals:**

- Changing the service/action descriptor contract.
- Adding an error-reporting service or changing logging infrastructure.
- Adding a test-only production route to trigger errors.
- Changing the visual design of the pages.
- Changing authentication cookies or session behavior.

## Decisions

### D1. Use the existing provider where it exists, and a standalone translator at the root

- `src/app/error.tsx` stays a client component and uses `useTranslations("errorPages")`.
- `src/app/not-found.tsx` stays a server component and uses `getTranslations("errorPages")`.
- `src/app/global-error.tsx` is a client component that cannot rely on `NextIntlClientProvider` because the root layout failed. It imports `messages/en.json` and `messages/el.json`, resolves the locale, and uses `createTranslator({ locale, messages, namespace: "errorPages" })` from `next-intl`.
- Add an `errorPages` namespace with `title`, `description`, `retry`, `notFoundTitle`, `notFoundDescription`, and `backToDashboard`.

**Why:** normal pages should keep using the provider and active locale; the root fallback needs a provider-free path that still reads from the same catalogs.

**Alternatives considered:**

- Hardcode bilingual strings in `global-error.tsx`: rejected because it bypasses the catalog contract and the parity check.
- Use a server component for `global-error`: rejected because Next.js requires the global error boundary to be a client component.

### D2. Make the locale cookie readable by the root fallback

Change `setLocaleCookie` to write `opencrm_locale` with `httpOnly: false`, keeping `sameSite=lax`, `secure` in production, and the one-year lifetime. The cookie contains only `en` or `el`; it is not a secret. Authentication and session cookies are untouched.

`resolveGlobalErrorLocale(cookieValue, navigatorLanguage)` is a pure helper:

1. A supported cookie value.
2. The first supported browser language.
3. English.

**Why:** the root-layout fallback needs the user's preference without a provider or a database read. A non-sensitive locale code is safe to expose to client code.

**Alternatives considered:**

- Keep `httpOnly` and use only `navigator.language`: simpler, but a Greek-preferring user on an English browser would see an English fallback.
- Add a second readable cookie: unnecessary duplication.
- Read the profile from the database: unavailable during a root-layout failure and inappropriate for an error boundary.

### D3. Generic, non-diagnostic error copy

`src/app/error.tsx` renders `errorPages.title`, `errorPages.description`, and `errorPages.retry`. It never reads or renders `error.message`, `error.stack`, or `error.digest`. A `useEffect` logs the digest (and the error only in development) for operators.

`global-error.tsx` behaves the same way and renders its own `<html lang={locale}>` and `<body>`.

**Why:** the existing `ui-localization` contract prohibits exposing internal details. The digest is the stable diagnostic handle for operators.

**Alternatives considered:**

- Keep `error.message` in development only: rejected because the same component would still need a risky branch; log it instead.
- Show the digest to the user: rejected because it is an internal identifier.

### D4. Not-found page uses the normal shell

`src/app/not-found.tsx` uses `getTranslations("errorPages")` and renders the localized title, description, and a dashboard link. It remains inside the root layout, so `<html lang>` and the provider are already correct. Because it uses request-scoped translations, it exports `dynamic = "force-dynamic"` so Next.js does not attempt to collect `/_not-found` page data without a request context.

**Why:** 404s are normal navigations, not root failures; they should use the same shell and locale as the rest of the app.

### D5. Test strategy

- Unit: `resolveGlobalErrorLocale` with a Greek cookie, a Greek browser preference, an unsupported value, and an empty input.
- Component: `ErrorPage` and `NotFound` in English and Greek; assert generic copy, no raw diagnostic, and the retry/back-link actions.
- Component: `GlobalError` renders `<html lang="el">`, Greek copy, and a retry action without a provider; spy on `console.error` for the diagnostic.
- E2E: Greek and English 404s, a localized dashboard link, and an axe check on the Greek 404.
- Catalog: `pnpm i18n:check` must cover the new `errorPages` keys.

## Risks / Trade-offs

- **Cookie flag change** → The locale cookie becomes readable by client code. It contains only `en`/`el`; no secrets or auth data. Auth.js cookies are unchanged.
- **Existing httpOnly cookie** → A cookie written before this change keeps the flag until it is rewritten on the next locale change or sign-in. Until then, the root fallback uses the browser preference or English; normal pages still use the server-readable cookie.
- **Global error bundle** → Importing the catalogs in the global error boundary adds a small client payload. The normal provider already ships the messages, so the marginal cost is limited to the error path.
- **Error boundary E2E** → Triggering a real root-layout failure in Playwright is brittle. Component tests cover the boundary; the 404 path is covered end-to-end.
- **Logging** → Log only a digest or a redacted diagnostic; never log customer data, tokens, or passwords.

## Migration Plan

1. Add the `errorPages` keys to both catalogs.
2. Change the locale cookie to non-httpOnly and update the cookie helper.
3. Update the error and not-found pages and add `global-error.tsx`.
4. Deploy. No database or data migration.
5. Rollback: revert the code and keep the locale cookie (a readable `en`/`el` cookie is harmless). No data is rewritten.

## Open Questions

None blocking.
