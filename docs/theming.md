# Theming

OpenCRM ships five color themes and three color modes. The theme is a per-user preference stored on the user record and mirrored in cookies so the server can render the correct document before the first paint.

## Themes and modes

| Theme identifier | Direction | Light primary hue | Dark primary hue |
| ---------------- | --------- | ----------------- | ---------------- |
| `default`        | Blue      | 257               | 257              |
| `violet`         | Violet    | 300               | 300              |
| `emerald`        | Green     | 160               | 160              |
| `amber`          | Warm gold | 75                | 80               |
| `rose`           | Pink      | 350               | 350              |

Modes are `light`, `dark`, and `system`. `system` follows the operating system and updates while the app is open. The default preference is `default` + `system`.

Theme identifiers are stable stored values. Display names and descriptions live in the `themes` namespace in `messages/en.json` and `messages/el.json`; do not store translated labels.

## Token architecture

All palette values are CSS custom properties in `src/app/globals.css` and are exposed to Tailwind through `@theme inline`.

The document root carries three attributes:

```html
<html lang="en" data-theme="violet" data-mode="dark" class="dark"></html>
```

Selector groups:

- Base light: `:root, [data-theme="default"]`
- Named light: `[data-theme="violet"]`, `[data-theme="emerald"]`, `[data-theme="amber"]`, `[data-theme="rose"]`
- Base dark: `.dark, .dark[data-theme="default"], .dark [data-theme="default"]`
- Named dark: `.dark[data-theme="violet"], .dark [data-theme="violet"]`, and the same pattern for the other themes

The descendant selector (`.dark [data-theme="violet"]`) lets profile swatches preview a candidate palette by placing `data-theme` on the swatch element. A swatch only paints its own small surface; it does not change surrounding content.

Every palette block defines the full surface set:

`background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `border`, `input`, `ring`, `chart-1` through `chart-6`, and the sidebar tokens, plus their foregrounds.

Semantic status tokens are intentionally not repeated per palette. `destructive`, `success`, `warning`, and `info` (and their foregrounds) change with the light/dark mode so their meaning stays consistent:

- `success`: green, for completed or healthy states
- `warning`: amber, for attention states
- `info`: blue, for neutral informational states
- `destructive`: red, for errors and destructive actions

Status feedback uses the `border-<token>/30 bg-<token>/10 text-<token>` pattern. `color-scheme` is set to `light` on the base light block and `dark` on the base dark block so native controls and scrollbars match.

## Persistence and first paint

- `users.theme` and `users.theme_mode` are the durable preference. Both are non-null text columns with check constraints; defaults are `default` and `system`.
- `opencrm_theme` and `opencrm_theme_mode` are one-year readable cookies written by `setThemeCookies`. They are not sensitive.
- `getThemePreference` validates the cookies and falls back independently to the defaults for malformed values.
- The root layout reads the cookies and passes the resolved pair to `RootDocument`.
- For explicit `light` and `dark`, the server writes the matching class. For `system`, a static inline script as the first child of `<body>` reads `data-mode`, checks `prefers-color-scheme`, and applies the `dark` class before any app content is parsed or painted. It is body-first rather than in `<head>` because Next's App Router lint rejects a manual `<head>` element. `ThemeRuntime` keeps the class in sync when the operating system preference changes.
- Sign-in, first-run setup, and invite acceptance synchronize the cookies from the resulting user record, so a new browser's first signed-in page uses the profile preference.
- `setThemeAction` validates the pair, writes the cookies, updates the signed-in user by session id, and revalidates the root layout.

`<html>` uses `suppressHydrationWarning` because the pre-paint script may change its class before React hydrates. Do not add the script through user data; it is a static constant.

If a Content Security Policy is added later, the inline system-mode script needs a nonce or hash. Keep the script in `RootDocument` as the single source.

## Adding a palette

1. Add the identifier to `THEMES` in `src/lib/theme/config.ts`.
2. Add its name and description keys to `THEME_LABEL_KEYS`, then add the English and Greek catalog entries under `themes`.
3. Add the light block `[data-theme="<id>"]` and the dark blocks `.dark[data-theme="<id>"], .dark [data-theme="<id>"]` to `src/app/globals.css`. Define every token in the palette set above. Tune lightness and chroma against the contrast targets.
4. Add the palette swatch usage automatically: `ThemePicker` and `ThemeMenu` iterate `THEMES`, so no component change is needed.
5. Update the `users_theme_check` constraint in `src/db/schema.ts`, run `pnpm db:generate`, and commit the generated `000N_*.sql` migration together with its snapshot and journal update.
6. Add the term to `docs/i18n/glossary.md`, run `pnpm i18n:check`, and request translator review.
7. Run `pnpm vitest run tests/unit/theme-tokens.test.ts`, the theme unit tests, and `pnpm build`.

Do not hand-edit `drizzle/meta/_journal.json`. If another migration lands first, regenerate with the next available number.

## Contrast verification

The palette values were checked with the OKLCH → linear sRGB relative-luminance conversion and the WCAG contrast formula. Targets: 4.5:1 for body text and control labels, 3:1 for large text and focus rings.

| Pair                                 | Light range | Dark range  | Target |
| ------------------------------------ | ----------- | ----------- | ------ |
| foreground / background              | 16.90–17.04 | 16.70–16.78 | 4.5    |
| primary-foreground / primary         | 4.88–5.91   | 6.24–9.96   | 4.5    |
| secondary-foreground / secondary     | 11.01–11.25 | 12.91–13.08 | 4.5    |
| muted-foreground / background        | 5.23–5.33   | 7.54–7.62   | 4.5    |
| accent-foreground / accent           | 13.55–13.69 | 12.01–12.28 | 4.5    |
| sidebar-foreground / sidebar         | 11.67–11.95 | 13.41–13.45 | 4.5    |
| ring / background                    | 3.56–5.82   | 6.24–9.96   | 3.0    |
| destructive-foreground / destructive | 4.62        | 5.23        | 4.5    |
| success / background                 | 5.36        | 8.95        | 4.5    |
| warning / background                 | 5.85        | 9.95        | 4.5    |
| info / background                    | 5.57        | 8.59        | 4.5    |
| warning-foreground / warning         | 5.94        | 9.96        | 4.5    |

Adjustment recorded: the light `warning-foreground` was changed from a dark brown to the light foreground token because dark text on the light warning fill measured 3.18:1. The warning fill now uses the light foreground at 5.94:1.

The automated suite additionally audits the dashboard and profile with axe in light and dark. If a palette changes, re-run that audit and update this table.

## Visual review checklist

For each theme and mode, check:

- `/dashboard`: cards, charts, legends, tooltips, and the sidebar
- `/companies`: tables, filters, empty states, pagination, and badges
- a create/edit form: inputs, validation, success and warning feedback
- a dialog and a dropdown: surfaces, borders, overlays, and focus rings
- a toast and a status banner
- desktop and mobile widths, including the header theme menu

Accepted deviations: none.

Visual review on 2026-10-26: all five themes in light and dark at 1280×900, plus the 360px and 768px header checks. Reviewed the dashboard, the companies table, the pipeline chart, the profile theme picker, and the command dialog. No visual or contrast deviations were found.
