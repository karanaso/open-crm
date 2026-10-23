export const locales = ["en", "el"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE = "opencrm_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "el";
}

export function resolveLocale(input: {
  cookie?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (isLocale(input.cookie)) return input.cookie;

  for (const part of input.acceptLanguage?.split(",") ?? []) {
    const base = part.trim().split(";")[0]?.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }

  return defaultLocale;
}
