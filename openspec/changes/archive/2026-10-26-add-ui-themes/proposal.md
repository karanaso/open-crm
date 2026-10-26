# Proposal

## Why

OpenCRM renders a single light blue palette. Dark token values exist in `globals.css`, but no code path ever applies the `dark` class, and status banners, badges, charts, toasts, and one input still use light-only hardcoded colors. Members cannot choose a palette or override their operating system's color scheme. A first-class theming system keeps every screen legible and intentional in multiple palettes and color modes.

## What Changes

- Add five named themes — Default (blue), Violet, Emerald, Amber, and Rose — each with tuned light and dark values, applied to the root element through `data-theme` and the existing `dark` class.
- Add a color mode of Light, Dark, or System. System follows the operating system preference and reacts to changes while the app is open. The default is System.
- Persist the theme and mode on the signed-in user record, mirror both in cookies for first-paint server rendering, and synchronize the cookies at sign-in so a new device restores the profile choice.
- Add a full theme picker to profile settings and a compact theme menu in the app header. Changing either applies without signing out or reloading manually.
- Add semantic `success`, `warning`, and `info` color tokens plus a `destructive-foreground` token and a sixth chart color. Replace light-only hardcoded colors in badges, form success messages, sign-in notices, listing and messaging warnings, CSV import feedback, invitation feedback, and the viewings calendar.
- Theme dashboard charts through CSS tokens, including series, grid, axes, legend, and tooltip surfaces, and make the toast surface follow the active mode.
- Localize every theme label and description in English and Greek.
- Add a Drizzle migration for the two non-null user preference columns with defaults and allowed-value checks.
- Cover defaults, persistence, cookie synchronization, fallback behavior, system resolution, initial render attributes, selection UI, and dark-mode accessibility in unit, integration, and end-to-end tests.

No new runtime dependency is required.

## Capabilities

### New Capabilities

- `ui-theming`: named palettes and color modes, per-user preference persistence and synchronization, first-paint rendering, themed semantic colors, and accessible theme selection.

### Modified Capabilities

None. Existing localization, access, and dashboard requirements remain unchanged.

## Impact

- **Data**: `users.theme` and `users.theme_mode`, a new Drizzle migration, user service defaults, and sign-in/setup/invite cookie synchronization.
- **Server**: root document and layout rendering, a new theme Server Action and validation schema, and profile settings.
- **UI**: global CSS tokens, app shell header, user menu area, profile page, badges, form feedback, dashboard charts, toast host, and hardcoded status notices.
- **Catalogs**: new English and Greek theme labels; `pnpm i18n:check` must continue to pass.
- **Tests**: unit coverage for validation, cookies, action, and root attributes; integration coverage for user preference persistence; end-to-end coverage for switching, reload, cross-browser sign-in, system mode, and accessibility in light and dark modes.
- **Migration ordering**: `main` already includes migration `0007` from the completed HTML email change, so this change adds `0008`.
- **Out of scope**: workspace-wide default themes, user-defined colors, scheduled theme switching, a dedicated high-contrast palette, theming of email content, and any public listings API change.
