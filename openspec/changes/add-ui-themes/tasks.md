# Tasks

## 1. Theme foundation and persistence

- [ ] 1.1 Add `src/lib/theme/config.ts` with the five theme identifiers, three modes, defaults, cookie names, max age, type guards, and a `resolveThemePreference` fallback helper. Add `tests/unit/theme-config.test.ts` covering valid values, unsupported values, and missing values; verify with `pnpm vitest run tests/unit/theme-config.test.ts`.
- [ ] 1.2 Add `src/lib/validation/theme.ts` with a Zod schema built from the shared constants. Add `tests/unit/theme-validation.test.ts` covering accepted combinations and rejection of tampered theme/mode values; verify with `pnpm vitest run tests/unit/theme-validation.test.ts`.
- [ ] 1.3 Add `theme` (default `default`) and `theme_mode` (default `system`) text columns with named check constraints to `users`, following the `locale` column style. Run `pnpm db:generate`, inspect the generated SQL for both columns and checks, and confirm the migration applies when the integration global setup runs.
- [ ] 1.4 Add `updateUserTheme(userId, theme, mode)` to `src/lib/services/users.ts`. Extend `tests/integration/auth.test.ts` with new-account defaults, a persisted update, and direct-write rejection of an unsupported value; verify with `pnpm vitest run --config vitest.integration.config.ts tests/integration/auth.test.ts`.
- [ ] 1.5 Confirm main's latest migration is `0007` and generate this change's migration as `0008`. If `main` advances before apply, regenerate with the next available number. Never hand-edit `drizzle/meta/_journal.json`; verify `pnpm db:generate` leaves a consistent journal and snapshot.

## 2. Cookie, Server Action, and sign-in synchronization

- [ ] 2.1 Add `src/lib/theme/cookie.ts` with `getThemePreference` and `setThemeCookies`, using the shared constants and one-year readable cookie options. Add `tests/unit/theme-cookie.test.ts` for cookie options, valid reads, and malformed-value fallback; verify with `pnpm vitest run tests/unit/theme-cookie.test.ts`.
- [ ] 2.2 Add `src/actions/theme.ts` exporting `setThemeAction(theme, mode)`: validate on the server, write cookies, update the signed-in user only by session id, and call `revalidatePath("/", "layout")`. Add `tests/unit/theme-action.test.ts` for valid changes, invalid changes, no signed-in user, and service failure behavior; verify with `pnpm vitest run tests/unit/theme-action.test.ts`.
- [ ] 2.3 Synchronize theme cookies at sign-in, first-run setup, and invite acceptance from the resulting user record, falling back to the defaults for a new account. Extract a small testable helper for this synchronization and add unit coverage; verify with `pnpm vitest run tests/unit/theme-cookie.test.ts tests/unit/locale-action.test.ts`.
- [ ] 2.4 Confirm `requireUser` and the app layout expose the new user fields without changing the session token shape. Verify with `pnpm typecheck` and a focused integration assertion that a signed-in user's stored theme is returned.

## 3. Token system and palettes

- [ ] 3.1 Add `success`, `warning`, `info`, their foregrounds, `destructive-foreground`, and `chart-6` tokens to `globals.css`, map them in `@theme inline`, and set `color-scheme` for light and dark. Add `tests/unit/theme-tokens.test.ts` that reads `globals.css` and asserts every required token exists for the base, every named theme, and every dark block; verify with `pnpm vitest run tests/unit/theme-tokens.test.ts`.
- [ ] 3.2 Define the full light and dark palettes for `default`, `violet`, `emerald`, `amber`, and `rose`, including tinted surfaces and all sidebar/chart tokens. Keep status colors semantic across themes. Verify the token contract test passes and visually inspect `/dashboard`, `/companies`, a form, a dialog, and a table in every theme and mode.
- [ ] 3.3 Confirm contrast for each palette and mode: body text at least 4.5:1, large text and focus rings at least 3:1, primary/destructive foregrounds readable. Record the checked pairs and any adjusted values in `docs/theming.md`; verify the documented values match the CSS.
- [ ] 3.4 Write `docs/theming.md` covering the token contract, selector structure, how to add a palette (CSS block, config constant, check constraint, catalog keys, migration), cookie/database persistence, and the CSP note for the inline script. Verify `pnpm exec prettier --check docs/theming.md` and that the "add a palette" steps reference real files.

## 4. Document rendering and runtime

- [ ] 4.1 Update `RootLayout` to read the theme preference from cookies and pass it into `RootDocument`. In `RootDocument`, render `data-theme`, `data-mode`, the resolved `dark` class, `suppressHydrationWarning`, the pre-paint system-mode script in `<head>`, `ThemeRuntime`, and the toast host inside the provider. Update `tests/unit/i18n-root-document.test.tsx` to assert attributes, dark class, and script for light, dark, and system modes; verify with `pnpm vitest run tests/unit/i18n-root-document.test.tsx`.
- [ ] 4.2 Add a client `ThemeRuntime` that listens to `prefers-color-scheme` while mode is `system` and toggles the root class, and cleans up its listener. Add `tests/unit/theme-runtime.test.tsx` with a mocked `matchMedia` covering initial dark, a live change, and a non-system mode; verify with `pnpm vitest run tests/unit/theme-runtime.test.tsx`.
- [ ] 4.3 Make the toast host accept and apply the active mode (`light`, `dark`, or `system`) instead of hardcoding light, and keep it mounted inside `RootDocument`. Add a focused component test or assertion in `tests/unit/i18n-root-document.test.tsx`; verify with `pnpm vitest run tests/unit/i18n-root-document.test.tsx`.

## 5. Selection UI and localization

- [ ] 5.1 Add English theme labels and descriptions (theme names, mode names, picker/menu labels, saved feedback) and the Greek equivalents. Add the terms to `docs/i18n/glossary.md` and request translator review. Verify with `pnpm i18n:check` and `pnpm vitest run tests/unit/i18n-catalog.test.ts`.
- [ ] 5.2 Build `ThemePicker` for profile settings using native radio fieldsets for palette and mode, with candidate palette swatches, localized accessible names, programmatic checked state, and a visible focus indicator. Add `tests/unit/theme-picker.test.tsx` covering current selection, both choices, and action invocation; verify with `pnpm vitest run tests/unit/theme-picker.test.tsx`.
- [ ] 5.3 Add the theme card to `settings/profile` and wire the signed-in user's `theme`/`themeMode` into the picker. Verify the page renders the current selection and that a change updates the profile, cookies, and html attributes after `router.refresh()`.
- [ ] 5.4 Build `ThemeMenu` in the app header using the existing dropdown radio items for modes and a checked palette list, with a link to profile settings, a localized icon-button label, and keyboard support. Wire `AppLayout`/`AppShell` to pass the user preference. Add `tests/unit/theme-menu.test.tsx`; verify with `pnpm vitest run tests/unit/theme-menu.test.tsx`.
- [ ] 5.5 Check the mobile header at 360px and 768px: the icon-only trigger must not overlap search or the user menu, and the menu must remain keyboard and screen-reader operable. Verify in the browser and in `tests/e2e/07-shell.mobile.spec.ts`.

## 6. Semantic colors, charts, and remaining light-only styles

- [ ] 6.1 Replace the twelve hardcoded status color locations (badge variants, form success, login/reset notice, listings currency warning, messaging sending/transport warnings, CSV import counts, invite success, viewings calendar chip) with token utilities. Update destructive button/badge foregrounds to `destructive-foreground`. Verify no `emerald-`/`amber-`/`sky-` status classes remain under `src`, and run `pnpm vitest run tests/unit/components.test.tsx`.
- [ ] 6.2 Update dashboard charts to use `var(--chart-1)` through `var(--chart-6)`, `var(--border)` for grids, `var(--muted-foreground)` for axes and legends, and themed tooltip surfaces. Verify no hardcoded hex colors remain in `src/components/dashboard/dashboard-charts.tsx` and inspect the dashboard in light and dark modes.
- [ ] 6.3 Replace the invite-link input's `bg-white` with a theme-aware surface. Verify no `bg-white` or `text-black` remains outside intentional overlay/decorative cases under `src`, and run the settings component tests.

## 7. End-to-end and accessibility verification

- [ ] 7.1 Add `tests/e2e/15-themes.spec.ts` covering: switching palette and mode from profile and seeing `data-theme`, `data-mode`, and the dark class; persistence after reload and sign-in from a fresh browser context; switching from the header menu and seeing profile reflect it; System mode with Playwright `emulateMedia` dark then light; and a serious/critical axe audit on the dashboard and profile in light and dark. Verify with `pnpm test:e2e -- tests/e2e/15-themes.spec.ts`.
- [ ] 7.2 Run the full unit, integration, localization, and type checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, and `pnpm i18n:check`.
- [ ] 7.3 Run a production build and the full browser suite: `pnpm build` and `pnpm test:e2e`.
- [ ] 7.4 Perform a final visual review of all five themes in light and dark at desktop and mobile widths, including charts, dialogs, toasts, status banners, tables, and forms; record any accepted deviations in `docs/theming.md`.

## Workflow follow-up

- Archive the change after review, verification, and merge to `main`.
