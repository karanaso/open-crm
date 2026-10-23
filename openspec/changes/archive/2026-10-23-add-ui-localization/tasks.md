# Tasks

## 1. Foundation

- [x] 1.1 Add `next-intl` to `package.json`, configure `createNextIntlPlugin` in `next.config.ts`, and verify `pnpm install` and `pnpm build` succeed.
- [x] 1.2 Add `users.locale` (`text`, not null, default `en`, check `en`/`el`) to `src/db/schema.ts`, generate and apply the migration, and verify existing users read `en` in an integration test.
- [x] 1.3 Add `src/i18n/config.ts` (locales, default, `Locale`, `isLocale`) and `src/i18n/request.ts` (cookie, `Accept-Language`, fallback); verify unit tests for the resolution order and `pnpm typecheck`.
- [x] 1.4 Wire `NextIntlClientProvider`, `<html lang>`, and `generateMetadata` in `src/app/layout.tsx`; verify `pnpm typecheck` and a component test that Greek renders `lang="el"`.
- [x] 1.5 Create `messages/en.json` and `messages/el.json` with the agreed namespaces and add `src/types/next-intl.d.ts`; verify `pnpm typecheck` rejects an unknown message key.
- [x] 1.6 Add `pnpm i18n:check` for key parity, empty values, and placeholder parity, plus unit tests; verify the command fails for a missing key and a changed placeholder, then passes.
- [x] 1.7 Add `src/i18n/format.ts` and update `src/lib/dates.ts`, `LocalTime`, and `DateDisplay` for locale-aware dates, USD, numbers, and durations; verify unit tests for Greek formatting and unchanged UTC values.
- [x] 1.8 Add `src/i18n/labels.ts` for enum labels and replace navigation `label` with `labelKey`; verify unit tests for every enum group and `pnpm typecheck`.
- [x] 1.9 Add the `opencrm_locale` cookie helpers and a `LanguageSwitcher` usable on auth pages; verify selecting Greek updates the cookie and re-renders the page in Greek.
- [x] 1.10 Add the profile language control and update `users.locale`; verify an integration test for profile persistence and immediate re-rendering.
- [x] 1.11 Sync the cookie from the profile on sign-in with `signIn(..., { redirect: false })`; verify an integration test that a Greek-preferring user opens a new session in Greek.
- [x] 1.12 Update setup and invite acceptance to store the cookie locale on new accounts; verify integration tests for both paths and the Greek auth E2E path.
- [x] 1.13 Document the localization architecture and catalog workflow in `docs/i18n/README.md`; verify the documented commands run as written.

## 2. Shared surfaces and contracts

- [x] 2.1 Add `MessageDescriptor` and `errorDescriptor`, and change `ActionState`; verify unit tests for `AppError`, unauthorized, forbidden, unknown errors, and parameters.
- [x] 2.2 Convert Zod schemas to `validation.*` keys and add `zodIssueKey`; verify unit tests for required, min, max, uuid, and the two locales.
- [x] 2.3 Update `FormError`, `FormField`, auth/settings forms, and import report rendering to translate descriptors; verify component tests for Greek field errors and error banners.
- [x] 2.4 Localize root metadata, auth layout copy, app shell, sidebar/mobile navigation, user menu, and the global search placeholder; verify the English E2E shell and Greek shell assertions.
- [x] 2.5 Localize setup, sign-in, invite, reset, profile, and team pages plus their success and error messages; verify auth/team integration tests and the Greek auth E2E path.
- [x] 2.6 Localize shared UI primitives and common states (empty state, pagination, confirm submit, toaster, page header, local/date display) without changing behavior; verify component tests and `pnpm test`.
- [x] 2.7 Document the error and validation descriptor contract in `docs/i18n/errors.md`; verify its examples match the implemented helpers.

## 3. Directory

- [x] 3.1 Backend: convert company, contact, tag, and CSV import errors to descriptors and validation keys; verify `pnpm test:integration tests/integration/directory.test.ts tests/integration/csv-import.test.ts`.
- [x] 3.2 Frontend: extract companies, contacts, tags, and import strings into the catalogs and use them in the module; verify `pnpm i18n:check`, `pnpm typecheck`, and the English directory E2E spec.
- [x] 3.3 QA: add Greek directory coverage (list, create, import error, archive) and verify the new tests plus `pnpm test:e2e tests/e2e/02-directory.spec.ts`.

## 4. Sales

- [x] 4.1 Backend: convert deal and pipeline errors to descriptors and validation keys; verify `pnpm test:integration tests/integration/deals.test.ts`.
- [x] 4.2 Frontend: extract deals, pipelines, Kanban, and metrics strings into the catalogs; verify `pnpm i18n:check`, `pnpm typecheck`, and the English deals E2E spec.
- [x] 4.3 QA: add Greek sales coverage (create, move, win/lose, occupied stage) and verify the new tests plus `pnpm test:e2e tests/e2e/03-deals.spec.ts`.

## 5. Support

- [x] 5.1 Backend: convert ticket, comment, and SLA errors to descriptors and validation keys; verify `pnpm test:integration tests/integration/tickets.test.ts`.
- [x] 5.2 Frontend: extract ticket list, detail, form, comment, and SLA strings into the catalogs; verify `pnpm i18n:check`, `pnpm typecheck`, and the English tickets E2E spec.
- [x] 5.3 QA: add Greek support coverage (status transition, internal note, SLA state) and verify the new tests plus `pnpm test:e2e tests/e2e/04-tickets.spec.ts`.

## 6. Marketing

- [x] 6.1 Backend: convert segment and campaign errors to descriptors and validation keys; verify `pnpm test:integration tests/integration/marketing.test.ts`.
- [x] 6.2 Frontend: extract segments, campaigns, audience, and metrics strings into the catalogs; verify `pnpm i18n:check`, `pnpm typecheck`, and the English marketing E2E spec.
- [x] 6.3 QA: add Greek marketing coverage (segment count, activation, snapshot, engagement) and verify the new tests plus `pnpm test:e2e tests/e2e/05-marketing.spec.ts`.

## 7. Engagement timeline

- [x] 7.1 Backend: convert activity and task errors to descriptors and validation keys; verify `pnpm test:integration tests/integration/engagement.test.ts`.
- [x] 7.2 Frontend: extract timeline, activity form, task form/section, and task list strings into the catalogs; verify `pnpm i18n:check`, `pnpm typecheck`, and the relevant English E2E specs.
- [x] 7.3 QA: add Greek timeline/task coverage (log activity, edit permission, complete/reopen task) and verify the new tests plus the directory/deals E2E specs.

## 8. Dashboard, search, and shell

- [x] 8.1 Frontend: extract dashboard metric labels, charts, recent activity, empty states, and search groups/empty states into the catalogs; verify `pnpm i18n:check`, `pnpm typecheck`, and the English dashboard/search E2E spec.
- [x] 8.2 QA: add Greek dashboard/search coverage (metrics, grouped search, short query) and verify the new tests plus `pnpm test:e2e tests/e2e/06-dashboard-search.spec.ts`.
- [x] 8.3 Accessibility: verify `lang`, localized aria labels, focus order, and the mobile menu in Greek; run `pnpm test:e2e tests/e2e/08-a11y.spec.ts` and document the result.

## 9. Translator and release

- [x] 9.1 Create `docs/i18n/glossary.md` and `docs/i18n/style-guide.md`; verify terms and formal Greek rules are documented.
- [x] 9.2 Complete `messages/el.json` with the translator, preserving keys and placeholders and leaving user data untranslated; verify `pnpm i18n:check` and review the diff.
- [x] 9.3 Review every Greek surface for grammar, pluralization, and text expansion; fix layout issues and verify the Greek E2E journey at desktop and mobile widths.
- [x] 9.4 Update `README.md` and `AGENTS.md` with supported locales, the switcher, catalog commands, and the rule that UI strings come from catalogs; verify the documented commands run as written.
- [x] 9.5 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm build`, and `pnpm i18n:check`; verify all pass from a clean tree.

## Workflow follow-up

- Archive the change after review and all tasks are complete.
