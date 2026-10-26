export const THEMES = ["default", "violet", "emerald", "amber", "rose"] as const;

export type Theme = (typeof THEMES)[number];

export const THEME_MODES = ["light", "dark", "system"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export const DEFAULT_THEME: Theme = "default";
export const DEFAULT_THEME_MODE: ThemeMode = "system";

export const THEME_COOKIE = "opencrm_theme";
export const THEME_MODE_COOKIE = "opencrm_theme_mode";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const THEME_LABEL_KEYS = {
  default: { name: "default.name", description: "default.description" },
  violet: { name: "violet.name", description: "violet.description" },
  emerald: { name: "emerald.name", description: "emerald.description" },
  amber: { name: "amber.name", description: "amber.description" },
  rose: { name: "rose.name", description: "rose.description" },
} as const satisfies Record<Theme, { name: string; description: string }>;

export const THEME_MODE_LABEL_KEYS = {
  light: "mode.light",
  dark: "mode.dark",
  system: "mode.system",
} as const satisfies Record<ThemeMode, string>;

export function isTheme(value: string | null | undefined): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return typeof value === "string" && (THEME_MODES as readonly string[]).includes(value);
}

export function resolveThemePreference(input: { theme?: string | null; mode?: string | null }): {
  theme: Theme;
  mode: ThemeMode;
} {
  return {
    theme: isTheme(input.theme) ? input.theme : DEFAULT_THEME,
    mode: isThemeMode(input.mode) ? input.mode : DEFAULT_THEME_MODE,
  };
}
