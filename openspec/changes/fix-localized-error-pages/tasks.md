# Tasks

## 1. Catalog and locale resolution

- [ ] 1.1 Add `errorPages.title`, `description`, `retry`, `notFoundTitle`, `notFoundDescription`, and `backToDashboard` to `messages/en.json` and `messages/el.json`; verify `pnpm i18n:check` passes.
- [ ] 1.2 Add `resolveGlobalErrorLocale(cookieValue, navigatorLanguage)` in `src/i18n/global-error-locale.ts` with cookie, browser, and English fallback; verify unit tests for Greek cookie, Greek browser, unsupported value, and empty input.
- [ ] 1.3 Change `src/i18n/cookie.ts` to write `opencrm_locale` with `httpOnly: false` while keeping `sameSite=lax`, `secure` in production, and the one-year lifetime; verify the cookie options in a unit test with a mocked `cookies()` store.

## 2. Error boundary

- [ ] 2.1 Update `src/app/error.tsx` to use `useTranslations("errorPages")`, render the generic title/description/retry copy, and never render `error.message`, `error.stack`, or `error.digest`; verify a component test in Greek and English, including a secret-looking raw message that must not appear.
- [ ] 2.2 Log the diagnostic from `src/app/error.tsx` without exposing it to the user; verify the component test spies on the logger and confirms the retry action calls `reset`.

## 3. Not-found page

- [ ] 3.1 Update `src/app/not-found.tsx` to use `getTranslations("errorPages")` and render the localized title, description, and dashboard link; verify component tests in Greek and English, including the dashboard link target.

## 4. Root-layout fallback

- [ ] 4.1 Add `src/app/global-error.tsx` that renders its own `<html lang>` and `<body>`, resolves the locale without `NextIntlClientProvider`, uses `createTranslator` with the `errorPages` namespace, and shows the generic copy and retry action; verify a component test for Greek cookie, Greek browser preference, English fallback, and the rendered `lang`.
- [ ] 4.2 Ensure `src/app/global-error.tsx` logs the diagnostic and never renders raw error details; verify the component test spies on the logger and asserts the retry action calls `reset`.

## 5. E2E, accessibility, and docs

- [ ] 5.1 Add `tests/e2e/10-error-pages.spec.ts` covering Greek and English 404 pages, the localized dashboard link, and an axe check on the Greek 404; verify `pnpm test:e2e tests/e2e/01-auth.spec.ts tests/e2e/10-error-pages.spec.ts`.
- [ ] 5.2 Update `docs/i18n/a11y.md` and `docs/i18n/README.md` with the error/404 coverage and the locale-cookie readability note; verify the documented commands run as written.

## 6. Final verification

- [ ] 6.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm build`, and `pnpm i18n:check`; verify all pass from a clean tree.

## Workflow follow-up

- Archive the change after review and all tasks are complete.
