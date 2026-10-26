# Spec Delta

## Purpose

Lets each member choose an OpenCRM palette and a light, dark, or system color mode that applies consistently across the interface and persists on their profile.

## ADDED Requirements

### Requirement: Available themes

The interface SHALL offer five themes: `default` (blue), `violet`, `emerald`, `amber`, and `rose`. Each theme MUST define values for every themed surface, text, border, control, chart, and feedback color in both light and dark modes. Theme identifiers are stable stored values; display names MUST be localized.

#### Scenario: Each theme applies across the app

- **WHEN** a signed-in user selects any supported theme
- **THEN** the dashboard, navigation, forms, tables, dialogs, charts, and status feedback use that theme's colors in the active mode

#### Scenario: Theme names are localized

- **WHEN** a Greek user opens the theme picker
- **THEN** every theme name and description is shown in Greek while the stored identifier remains unchanged

#### Scenario: Unsupported theme falls back

- **WHEN** a stored or requested theme identifier is not one of the five supported values
- **THEN** the interface uses the `default` theme without blocking access

### Requirement: Color mode resolution

The interface SHALL support `light`, `dark`, and `system` color modes. In `system` mode it MUST follow the operating system preference and MUST react when that preference changes. An unsupported or missing mode MUST resolve to `system`.

#### Scenario: Explicit light and dark modes

- **WHEN** a user selects Light or Dark
- **THEN** the interface uses that mode regardless of the operating system preference

#### Scenario: System mode follows the operating system

- **WHEN** a user selects System and the operating system prefers dark
- **THEN** the interface renders in dark mode

#### Scenario: System mode reacts live

- **WHEN** the operating system color preference changes while the app is open in System mode
- **THEN** the interface switches mode without a reload

#### Scenario: Missing mode defaults to System

- **WHEN** no valid mode preference exists
- **THEN** the interface resolves the mode from the operating system preference

### Requirement: Theme preference persistence and synchronization

A signed-in user's theme and mode MUST be stored on their profile. The interface MUST mirror both in readable cookies and use them for server rendering. Signing in MUST synchronize the cookies from the profile, so a new device restores the saved choice. A theme change MUST apply without signing out.

#### Scenario: Preference survives reload and sign-in

- **WHEN** a user selects a theme and mode, reloads, signs out, and signs in again
- **THEN** the same theme and mode are restored from the profile

#### Scenario: New device uses the profile preference

- **WHEN** a user with a saved Violet dark preference signs in from a different browser
- **THEN** the first signed-in page renders Violet in dark mode

#### Scenario: Change applies immediately

- **WHEN** a user changes theme or mode from profile settings or the header menu
- **THEN** the interface updates without signing out and keeps the choice after reload

#### Scenario: Default preference

- **WHEN** a new account is created without choosing a theme
- **THEN** the profile stores the `default` theme and `system` mode

### Requirement: First-paint theme rendering

The server-rendered document MUST carry the stored theme and resolved mode attributes before any content is visible. In System mode the operating system preference MUST be applied before the first paint, and the document's `color-scheme` MUST match the resolved mode.

#### Scenario: No flash of the wrong mode

- **WHEN** a user with a saved dark or system-dark preference opens or reloads a page
- **THEN** the page is painted in dark mode without first showing a light frame

#### Scenario: Server markup carries the preference

- **WHEN** a page is rendered on the server with a stored theme and mode
- **THEN** the root document exposes the theme identifier, the mode, and the resolved dark state

#### Scenario: Native controls match the mode

- **WHEN** the interface is displayed in dark mode
- **THEN** native inputs, scrollbars, and form controls use the dark color scheme

### Requirement: Theme selection controls

Profile settings MUST provide a theme picker for both palette and mode. The app header MUST provide a compact theme menu for quick mode and palette changes. Both controls MUST be keyboard operable with localized accessible names, MUST indicate the current selection programmatically, and MUST NOT rely on color alone to identify a choice.

#### Scenario: Profile picker exposes the full choice

- **WHEN** a user opens profile settings
- **THEN** all five themes and all three modes are available with the current selection marked

#### Scenario: Header menu changes the theme quickly

- **WHEN** a user chooses a theme or mode from the header menu
- **THEN** the change applies to the current page and matches the profile selection

#### Scenario: Accessible names are localized

- **WHEN** a Greek user navigates the theme controls with a screen reader
- **THEN** every control and option is announced with its Greek accessible name

### Requirement: Theme-independent semantic colors

Success, warning, info, destructive, and chart colors MUST adapt to the active theme and mode. Status feedback, badges, toasts, and chart series, grids, axes, legends, and tooltips MUST remain legible in light and dark modes without component-specific hardcoded palettes.

#### Scenario: Status feedback is legible in dark mode

- **WHEN** a success, warning, or error message is shown in dark mode
- **THEN** its text, border, and surface remain readable and consistent with the theme

#### Scenario: Toasts follow the mode

- **WHEN** a toast appears while the interface is dark
- **THEN** the toast uses dark surfaces and readable text

#### Scenario: Charts follow the theme

- **WHEN** a dashboard chart is shown in any theme and mode
- **THEN** series, axes, grids, legend, and tooltip use theme colors with readable contrast

#### Scenario: No light-only colors leak into dark mode

- **WHEN** any themed page is displayed in dark mode
- **THEN** no badge, banner, input, card, or chart retains a light-only background

### Requirement: Theme accessibility and contrast

Text, controls, focus indicators, and status colors MUST meet WCAG 2.1 AA contrast in every supported theme and mode. Theme changes MUST NOT remove visible focus, hide content, or break reduced-motion expectations.

#### Scenario: Contrast holds for every theme

- **WHEN** a representative page is audited in each theme and mode
- **THEN** no serious or critical accessibility violations are reported

#### Scenario: Focus remains visible

- **WHEN** a keyboard user tabs through theme controls and primary actions in any theme
- **THEN** the focused control has a visible, high-contrast focus ring

### Requirement: Theme input validation and storage integrity

Theme and mode values MUST be validated on the server before use. Invalid input MUST be rejected without changing the stored preference or cookies. The database MUST reject unsupported identifiers, and malformed cookie values MUST fall back to the defaults instead of failing a request.

#### Scenario: Tampered request is rejected

- **WHEN** a client submits an unsupported theme or mode
- **THEN** the Server Action rejects it and no preference or cookie is changed

#### Scenario: Database rejects unsupported values

- **WHEN** an unsupported theme or mode is written directly to the user record
- **THEN** the database constraint rejects the write

#### Scenario: Malformed cookie is ignored

- **WHEN** a request carries an invalid theme or mode cookie
- **THEN** the page still renders with the default theme and system mode
