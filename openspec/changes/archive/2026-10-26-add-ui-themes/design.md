# Design

## Context

See `proposal.md` — Why. The current constraints that shape this design:

- `src/app/globals.css` already defines light tokens in `:root` and dark tokens in `.dark`, with Tailwind v4's `@custom-variant dark (&:is(.dark *))`. Nothing ever adds the `dark` class, so the dark values are unreachable today.
- `RootDocument` renders `<html lang>` and `NextIntlClientProvider`; the toast host is mounted separately in the root layout and is hardcoded to `theme="light"`.
- Locale already establishes the persistence pattern: a `users.locale` text column with a check constraint, a readable one-year cookie, server rendering from the cookie, and cookie synchronization at sign-in, setup, and invite acceptance.
- `users` is small and uses text + check constraints for constrained values (`locale`), not PostgreSQL enums.
- Dashboard charts use hardcoded series hex values, `#e5e7eb` grids, and Recharts' default light tooltip. Twelve component locations use light-only status classes (`emerald`, `amber`, `sky`).
- The project has no theme library, no `next-themes`, and no client-side preference store. The app is fully server-rendered and already requires JavaScript.
- The main branch's latest migration is `0007` (the HTML email body column), so the next generated migration for this change is `0008`.

## Goals / Non-Goals

**Goals:**

- One token architecture that covers every surface in both modes and all five named palettes.
- First paint matches the persisted preference for signed-in, signed-out, and system-mode users.
- A single source of truth for theme identifiers, cookie names, defaults, validation, and fallback.
- Keep the change dependency-free and consistent with the existing locale pattern.
- Make semantic feedback and chart colors mode-aware so dark mode is genuinely usable, not just tinted.

**Non-Goals:**

- A workspace-wide default theme or administrator-managed branding.
- User-defined palettes, per-page themes, or theme scheduling.
- A separate high-contrast theme. WCAG AA must hold in the five shipped themes.
- Theming email HTML, campaign content, or anything outside the web UI.
- Changing locale resolution, currency, or time-zone behavior.

## Decisions

### 1. CSS token architecture, not a theme library

Add `data-theme` to the root element and keep the existing `.dark` class:

```html
<html lang="en" data-theme="violet" data-mode="dark" class="dark">
```

CSS blocks are grouped so the same values apply to the document root and to nested preview swatches:

- Base light tokens: `:root, [data-theme="default"]`
- Named light overrides: `[data-theme="violet"]`, `[data-theme="emerald"]`, etc.
- Base dark tokens: `.dark`, `.dark[data-theme="default"]`, `.dark [data-theme="default"]`
- Named dark overrides: `.dark[data-theme="violet"]`, `.dark [data-theme="violet"]`, etc.

The nested selector forms let the profile swatches render a candidate palette by placing `data-theme="<candidate>"` on the swatch itself. They inherit only the candidate's variables, not the whole document.

Each named theme block sets a complete palette: background, card, popover, primary, secondary, muted, accent, border, input, ring, the six chart colors, and all sidebar tokens, plus their foregrounds. `default` restates the current blue palette so it stays visually close to today. Dark blocks mirror the same keys. The semantic status tokens (`success`, `warning`, `info`, `destructive`) do not change per palette; they change only per mode so meaning stays stable across themes.

Add `--chart-6` and `--destructive-foreground`, and map all new tokens through `@theme inline` so Tailwind utilities such as `bg-success/10`, `text-warning`, and `border-info/30` work. Set `color-scheme: light` on `:root` and `color-scheme: dark` on `.dark` so native controls and scrollbars follow.

**Why not `next-themes`:** it treats `localStorage`/system as the source of truth, which conflicts with the profile and cookie requirements, adds a hydration-suppression layer, and still would not provide named palettes. The CSS-first approach is smaller, fully server-renderable, and auditable.

**Why not inline style variables from the database:** it bloats every response, prevents static CSS auditing, and provides no fallback when the database is unavailable.

### 2. Scope of a "theme"

A theme changes the chromatic identity of the app: primary/active states, tinted background/card/sidebar surfaces, focus ring, and chart family. It does not change typography, spacing, radii, or status semantics. Palette identifiers and visual direction:

| Identifier | Direction | Light primary hue (OKLCH) | Dark primary hue (OKLCH) |
| --- | --- | --- | --- |
| `default` | Blue, current look | ~257° | ~257° |
| `violet` | Violet/purple | ~300° | ~300° |
| `emerald` | Green/teal | ~160° | ~160° |
| `amber` | Warm gold | ~75° | ~75° |
| `rose` | Pink/magenta | ~350° | ~350° |

Exact lightness and chroma values are tuned during implementation so that body text reaches 4.5:1, large/bold text and focus rings reach 3:1, and primary buttons keep their foreground readable. Amber needs a dark foreground in light mode; the default white foreground is not acceptable for every hue. Status colors stay red/amber/blue-green regardless of theme to avoid changing meaning.

An alternative was to keep neutrals identical and change only accents. That is effectively "accent color", not a palette, and was rejected in favour of tinted surfaces with full light/dark tuning.

### 3. Mode resolution and first paint

- `data-mode` is always one of `light`, `dark`, `system`.
- For `light` and `dark`, the server writes the matching class and no script is needed.
- For `system`, the server omits `dark` and a tiny synchronous inline script, rendered as the first child of `<body>`, reads `document.documentElement.dataset.mode`, checks `matchMedia("(prefers-color-scheme: dark)")`, and toggles the class before app content is parsed or painted. It is body-first rather than in `<head>` because Next's App Router lint rejects a manual `<head>` element; a parser-blocking script before any content has the same pre-paint effect.
- A client `ThemeRuntime` component listens to the media query while the mode is `system` and toggles the class when the OS preference changes. It also runs on mount to reconcile after hydration.
- `suppressHydrationWarning` is added to `<html>` because the pre-paint script can change `class` before React hydrates. The script is a static constant; no user data is interpolated.
- `color-scheme` in CSS handles native controls. No `meta name="theme-color"` change is required for this self-hosted desktop-first app.

**Why not resolve system mode on the server from a cookie:** the server cannot know the OS preference, and storing a snapshot would go stale when the OS changes.

**Why not CSS-only `@media` overrides:** it would duplicate every dark palette block inside media queries and still need a client listener for live changes; the inline script is smaller and keeps one dark block per theme.

CSP note: the inline script is static. If the project later adds a Content Security Policy, it needs a nonce or hash for this script.

### 4. Persistence and synchronization

- Schema: `users.theme` (`text`, not null, default `'default'`, check in the five identifiers) and `users.theme_mode` (`text`, not null, default `'system'`, check in the three modes). Text + named checks follow the `locale` precedent and keep future palette additions a normal migration.
- Cookies: `opencrm_theme` and `opencrm_theme_mode`, one year, `sameSite: "lax"`, `secure` in production, path `/`, readable (`httpOnly: false`). They are non-sensitive and readable cookies let the UI and tests inspect them; the inline script itself uses `data-mode`, not the cookie.
- Server rendering: the root layout reads both cookies through a `getThemePreference()` helper that validates them and falls back to `default` / `system`.
- Signed-in source of truth: the profile. `updateUserTheme(userId, theme, mode)` is called only with the session user's id by `setThemeAction`.
- `setThemeAction(theme, mode)` re-validates with Zod, writes both cookies, updates the user when signed in, and calls `revalidatePath("/", "layout")`. It returns a locale-independent error descriptor for invalid input and never trusts the client.
- Sign-in, setup, and invite acceptance call `setThemeCookies` from the resulting user record (or the defaults for a freshly created account), so a new browser's first signed-in request already has the right values. Sign-out leaves the cookies in place, matching the locale behavior; the next sign-in overwrites them.
- Auth pages have no theme picker, but they honor the cookies left by the last signed-in session.

**Why cookies at all if the database is authoritative:** the root layout renders every route, including auth pages, and must not query the database just to paint the document. Cookies are the only per-request value available before the first byte. This is the same trade-off already accepted for locale.

**Why not localStorage:** it is unavailable during server rendering, so it cannot prevent a flash, and it would create a second source of truth alongside the profile.

### 5. UI composition

- `RootDocument` becomes the owner of the document: it accepts `theme` and `themeMode`, renders the html attributes and pre-paint script, and mounts `ThemeRuntime` and the toast host inside the provider instead of in `RootLayout`.
- `AppLayout` passes the signed-in user's `theme` and `themeMode` into `AppShell`, so the header menu and profile picker reflect the database rather than a stale cookie.
- Profile card (`ThemePicker`): two native radio fieldsets — one for the five palettes, one for the three modes. Native inputs provide keyboard semantics and screen-reader grouping without a new Radix dependency. Each palette option shows a swatch preview plus a localized name; selection is marked with a checked control and visible ring, not color alone.
- Header menu (`ThemeMenu`): a dropdown in the app header, before the user menu. It contains a mode radio group and five palette items with a check indicator, and links to profile settings for the full picker. It reuses the existing `DropdownMenuRadioItem` primitive. The trigger is icon-only with a localized `aria-label`.
- Both controls call `setThemeAction` in a transition and then `router.refresh()`, mirroring `LanguageSwitcher`. Server revalidation updates the html attributes and all mounted UI; no full page reload occurs.

**Why duplicated controls:** the profile is the discoverable full picker; the header is the fast switch. Both write the same action, so there is no divergent state.

### 6. Semantic color and chart cleanup

- New tokens: `success`, `warning`, `info` with foregrounds, `destructive-foreground`, and `chart-6`; map them in `@theme inline`.
- Replace all twelve light-only status locations with token utilities: badge success/warning/info variants, `FormSuccess`, login/reset notice, listings currency warning, messaging sending warning and transport warning, CSV import result counts, invite success, and viewings calendar chip. Use the `border-<token>/30 bg-<token>/10 text-<token>` pattern.
- Destructive buttons and badges use `text-destructive-foreground` so dark mode keeps contrast.
- Replace the invite-link input's `bg-white` with `bg-muted` or `bg-background`.
- Charts: series use `var(--chart-1)` … `var(--chart-6)`, grid uses `var(--border)`, axis/legend text uses `var(--muted-foreground)`, and the Recharts tooltip uses `var(--popover)`, `var(--popover-foreground)`, and `var(--border)` for content, label, and item styles. Keep the existing hidden table that provides the accessible chart summary.
- Toaster: pass the active mode (`light`, `dark`, or `system`) to Sonner. Sonner's `system` option follows the same OS media query our runtime follows, so the two stay aligned.

**Fallback if Tailwind's opacity modifier fails on the new tokens:** define explicit `*-soft` variables and use those instead. This is an implementation detail, not a spec change.

### 7. Validation and constants

`src/lib/theme/config.ts` owns:

- `THEMES = ["default", "violet", "emerald", "amber", "rose"] as const`
- `THEME_MODES = ["light", "dark", "system"] as const`
- defaults (`default`, `system`), cookie names, and max age
- type guards `isTheme` / `isThemeMode`
- `resolveThemePreference({ theme, mode })` for cookie fallback
- a label key map for localized names/descriptions (keys only, no English strings)

`src/lib/validation/theme.ts` builds a Zod schema from those constants. `src/actions/theme.ts` is the only writer. The database checks are the final backstop for direct writes.

## Risks / Trade-offs

- **Palette contrast is the main quality risk** → constrain each palette to a small set of tested foreground/background pairs, use OKLCH, audit representative pages with axe in light and dark, and manually verify amber/rose primary buttons where white text may fail.
- **Pre-paint class mutation can cause hydration warnings** → `suppressHydrationWarning` only on `<html>`, a static script, and an e2e test that emulates a dark system preference.
- **Database and cookie can diverge on a failed half-write** → the action writes cookies first and the database second; the root keeps rendering the cookie; the next successful action or sign-in reconciles both. Tests assert both sides after a change.
- **Migration numbering can drift if `main` advances before apply** → generate `0008` from the current `0007` baseline, and if `main` gains another migration first, regenerate with the next available number using `pnpm db:generate`; never hand-edit `_journal.json`. The columns are additive with constant defaults, so the migration is fast and rollback is a drop.
- **Enabling System by default flips existing users with a dark OS to dark mode** → intended by the specs; mention it in release notes. Users can force light in profile or header.
- **Recharts does not consume Tailwind classes** → use CSS variables directly in SVG props and explicit tooltip styles; verify in the browser, not only in jsdom.
- **Sonner's `system` theme uses its own media query** → pass the mode through and cover it in the dark-mode e2e audit; do not special-case toasts.
- **CSS variable selectors for nested swatches can over-apply** → scope the desktop swatch preview with `data-theme` only on the small preview element, and verify that a swatch inside an active theme does not repaint surrounding content.
- **The theme cookie is readable by scripts** → acceptable because it is a non-sensitive preference and matches the locale cookie; no authorization decision depends on it.

## Migration Plan

1. Generate the additive migration as `0008` on top of main's `0007`. Add `theme` and `theme_mode` with non-null defaults and named check constraints.
2. Deploy the migration before or with the app; existing rows receive `default` / `system` automatically. No backfill script is needed.
3. Ship the CSS tokens, document rendering, action, and UI in that order, but in a single release so the new columns are never written by old code.
4. Rollback: reverting the app leaves the columns unused; dropping them later is safe because no other table references them. Do not run destructive commands against development or production data without approval.

## Open Questions

- Exact OKLCH values and swatch artwork will be tuned during implementation against the contrast targets; the five identifiers and light/dark variants are fixed by the specs.
