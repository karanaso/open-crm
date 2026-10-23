# Design

## Context

See `proposal.md` for motivation and `specs/ui-localization/spec.md` plus `specs/workspace-access/spec.md` for the behavior contract.

Current constraints that shape the approach:

- Next.js 15 App Router, React 19, strict TypeScript, `typedRoutes`, 37 pages, 60 components, and 103 TSX files.
- No i18n layer. English strings live in pages, client components, `src/components/layout/sidebar-nav.tsx`, `src/lib/constants.ts`, auth layout copy, metadata, validation schemas, and Server Action errors.
- `src/lib/dates.ts` hardcodes `en-US`. `LocalTime` and `DateDisplay` use the browser default locale.
- `AppError` already carries a `code`, but `errorMessage()` returns the English `message`. There are 107 `new AppError` call sites and about 33 distinct codes. `ActionState` exposes strings for `error`, `fieldErrors`, and `success`.
- Zod schemas embed English messages such as `"Select a requester"` and `"A record can have at most 20 tags"`.
- Auth.js uses JWT sessions. `users` has no locale column. `src/middleware.ts` guards routes only; there is no locale segment.
- The interface is an internal, authenticated CRM. URL-shareable locale links and SEO are not requirements.

## Goals / Non-Goals

**Goals:**

- English and Greek UI with English as the default.
- Locale persisted on the user record and mirrored in a cookie; no URL changes.
- One catalog contract with stable keys, placeholder parity, and typed message keys.
- Locale-aware dates, numbers, USD amounts, durations, enum labels, validation, errors, aria labels, and metadata.
- Incremental module rollout that keeps the English default and existing tests green.

**Non-Goals:**

- URL-prefixed locales, RTL layouts, or more than English and Greek.
- Translating user-entered content, pipeline stage names, tags, notes, campaign copy, company/contact names, or CSV headers.
- Changing stored enum values, USD, UTC calendar-hour SLA rules, authentication, authorization, or the single-workspace model.
- Email delivery or external translation services.

## Decisions

### D1. `next-intl` in no-routing mode

Use `next-intl` with `getRequestConfig` reading the locale cookie and request headers. Do not introduce a `[locale]` route segment.

**Why:** the app has 37 routes, `typedRoutes`, Auth.js callbacks, middleware matchers, and redirects that all assume locale-free paths. URL-prefixed locales would require moving every route, updating auth callbacks and redirects, and rewriting E2E paths. The CRM is internal, so shareable locale URLs are not worth that churn.

**Alternatives considered:**

- URL prefix `/[locale]/...`: rejected for route/auth/test churn.
- Custom catalog helper: rejected because ICU pluralization, provider wiring, and typed keys would be reimplemented; `next-intl` is the smaller total change.

### D2. Locale storage and resolution

Add `users.locale` as a `text` column, not null, default `'en'`, with a database check constraint for `('en', 'el')`. Validate the same values with Zod. A text column plus check is preferable to a PostgreSQL enum because adding a language later is a normal migration rather than an enum alteration.

Add a locale cookie named `opencrm_locale` with `httpOnly`, `sameSite=lax`, `secure` in production, and a one-year lifetime. The runtime resolution order is:

1. A supported locale cookie.
2. The first supported language in `Accept-Language`.
3. `en`.

The profile preference is the durable source for signed-in users; the cookie is the per-request runtime source, so the root layout does not need a database query on every request. A second device with an existing session keeps its old cookie until its next sign-in. Sync the two at these points:

- **Sign-in:** `signInAction` uses `signIn(..., { redirect: false })`, reads the authenticated user's `locale`, sets the cookie, then redirects to the sanitized callback URL.
- **Profile change:** the action updates `users.locale`, sets the cookie, and revalidates the layout.
- **Setup/invite acceptance:** the new account stores the current cookie locale (or `en`), and the action sets the cookie.
- **Auth pages:** the language control writes the cookie only; there is no user yet.

If a signed-in user clears the cookie, the request falls back to `Accept-Language` or English until the next sign-in. This is acceptable and covered by the default-locale scenario.

**Alternatives considered:**

- Locale in the Auth.js JWT: makes auth pages and stale-session updates harder; the cookie is simpler.
- Reading `users.locale` in the root layout: adds a database query to every request and still needs a cookie for auth pages.
- URL prefix: rejected in D1.

### D3. Provider wiring and catalog layout

- `src/i18n/config.ts`: supported locales, default locale, `Locale` type, `isLocale()`.
- `src/i18n/request.ts`: `getRequestConfig` reads the cookie and `Accept-Language` and returns the locale and messages.
- `next.config.ts`: wrap the config with `createNextIntlPlugin("./src/i18n/request.ts")`.
- `src/app/layout.tsx`: read `getLocale()` and `getMessages()`, render `<NextIntlClientProvider>`, and set `<html lang={locale}>`. Move metadata to `generateMetadata()` using `getTranslations("metadata")`.
- `src/types/next-intl.d.ts`: augment `next-intl` with the shape of `messages/en.json` so keys are checked at compile time.

Catalog namespaces: `common`, `nav`, `metadata`, `auth`, `settings`, `directory`, `sales`, `support`, `marketing`, `dashboard`, `timeline`, `validation`, `errors`, `enums`.

English is the source of truth. Greek mirrors every key. All messages are passed to the client provider for simplicity; if the client bundle becomes a concern, pass only the namespaces used by client components. Configure `getMessageFallback` to look up the English catalog and log the missing key, so a runtime gap never renders a raw key.

### D4. Locale-aware formatting

Add `src/i18n/format.ts` with locale-aware helpers for dates, date-times, numbers, USD amounts, and durations. Use `Intl.DateTimeFormat`, `Intl.NumberFormat`, and `Intl.RelativeTimeFormat`.

- Date-only values and SLA calculations remain UTC. Timestamp display keeps the existing local-time behavior; only the locale changes.
- Amounts remain USD. Greek formatting may place the symbol differently, but the currency is unchanged.
- `src/lib/dates.ts` keeps pure date math (`todayUtc`, `isDateBeforeToday`, `isDateAfterDays`, `startOfMonthUtc`, `addDays`, `daysBetween`). Remove its hardcoded `en-US` formatting or delegate to `src/i18n/format.ts`.
- `LocalTime` uses `useLocale()` and `DateDisplay` accepts a locale. No component may fall back to `Intl.DateTimeFormat(undefined)` for user-facing text.
- Durations use translated unit keys with ICU pluralization, not hardcoded `m`/`h`/`d`.

### D5. Enum labels and navigation

Add `src/i18n/labels.ts` with typed label keys for roles, ticket statuses and priorities, deal statuses and stage outcomes, task priorities and statuses, activity types, campaign channels and statuses, and recipient statuses. Components resolve labels through `useTranslations("enums")` or server-side `getTranslations("enums")`.

Stored values remain the current English identifiers. Pipeline stage names, tags, names, notes, and campaign copy are user data and are never translated.

Replace navigation `label` values in `src/lib/constants.ts` with `labelKey` values and translate in the shell. Remove the duplicate navigation list in `sidebar-nav.tsx` or derive it from the shared constant. `APP_NAME` is not translated.

### D6. Locale-independent error and validation contract

Keep `AppError.code` as the stable error identifier and add optional `params` for interpolation. The `message` remains diagnostic for logs and tests, but it is never rendered.

Change `ActionState` to carry descriptors:

```ts
type MessageDescriptor = { key: string; params?: Record<string, string | number> };

type ActionState = {
  error?: MessageDescriptor;
  fieldErrors?: Record<string, MessageDescriptor[]>;
  success?: MessageDescriptor;
  inviteUrl?: string;
  resetUrl?: string;
  report?: ImportReport;
} | null;
```

- `errorDescriptor(error)` maps `AppError` to `{ key: "errors." + code, params }`, maps `UnauthorizedError`/`ForbiddenError` to their codes, and maps unknown errors to `errors.GENERIC` while logging the diagnostic.
- `fieldErrorsFromZod()` returns descriptors. Zod schemas use `validation.*` keys for custom messages; default Zod messages map through a small `zodIssueKey()` helper (required, min, max, uuid, invalid format).
- `FormError` and `FormField` translate descriptors with `useTranslations`. `ImportReport` row errors become descriptors and are translated by the import form.
- Services never import catalogs, `useTranslations`, or UI code.

The 107 `AppError` sites need a mechanical pass. `NOT_FOUND` can use one generic message. Dynamic messages either gain params or a more specific code. The tests assert codes and descriptors, not English sentences.

**Alternatives considered:**

- Keep English strings and translate in the UI: rejected because services would still leak language and every call site would need special handling.
- Return full sentences from services: rejected because it puts presentation in the domain layer and breaks non-UI callers.

### D7. Migration and rollout

One additive migration adds `users.locale` with default `'en'`; existing rows are backfilled by the default. No other schema changes.

Rollout keeps the English default and lands in phases:

1. Foundation: dependency, config, provider, column/migration, cookie, switcher, catalog skeletons, key-parity check, format helpers.
2. Shared surfaces and contracts: root/auth/app layouts, navigation, user menu, auth/setup/invite/reset, profile and team settings, common UI primitives, error and validation descriptors.
3. Directory: companies, contacts, tags, CSV import.
4. Sales: pipelines, stages, deals, Kanban, metrics.
5. Support: tickets, comments, SLA.
6. Marketing: segments, campaigns, audience, engagement.
7. Dashboard and global search: metrics, charts, recent activity, shell.
8. Translator pass, Greek E2E journey, full verification, documentation.

Each phase keeps `en` as the default so existing English E2E coverage remains the baseline. Greek coverage grows with the phases.

### D8. Testing strategy

- Unit: catalog key parity, placeholder parity, no empty values, format helpers, enum-label mapping, error descriptors.
- Integration: `users.locale` persistence, sign-in cookie sync, profile update, error-code contracts.
- Component: Greek rendering through `NextIntlClientProvider`, field errors, enum labels.
- E2E: a new `tests/e2e/09-localization.spec.ts` switches to Greek, verifies navigation and a directory flow, reloads and signs in on a fresh session, then switches back to English. Existing English specs remain.
- Commands: `pnpm i18n:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm build`.

## Risks / Trade-offs

- **Large error/validation refactor** (107 `AppError` sites, all Zod schemas) → central helpers, a code map, phase 2, and tests before module extraction.
- **Cookie/profile drift** → sync at sign-in and profile change; test new-device sign-in and cookie-cleared fallback. A second active session keeps its old locale until its next sign-in.
- **Greek text expansion** → translator flags long strings; verify mobile widths, buttons, tabs, and table headers.
- **`next-intl` compatibility with Next 15 / React 19** → verify the provider in a focused integration test before the module rollout; the approved fallback is a small custom catalog, but that is not planned.
- **Full message payload to the client** → acceptable for this app size; optimize by namespace if needed.
- **Existing tests assert English strings** → English remains the default; update action/validation tests to assert descriptors where the contract changed.
- **User data mistranslation** → explicit non-goal, translator review, and no catalog writes from services.

## Migration Plan

1. Add `next-intl` and the plugin configuration.
2. Add `users.locale` and generate/apply the migration. Existing users become `en`.
3. Deploy the app with English as the default; the locale cookie is optional.
4. Roll out module catalogs and translated surfaces behind the same default.
5. Rollback: revert the app and dependency. The `users.locale` column is additive and can remain; the cookie is ignored. No data is rewritten, so rollback does not lose user data.

## Open Questions

None blocking. Greek glossary wording will be finalized by the translator during implementation and does not change the specs, approach, or task breakdown.
