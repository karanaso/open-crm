import { cookies } from "next/headers";
import {
  resolveThemePreference,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  THEME_MODE_COOKIE,
  type Theme,
  type ThemeMode,
} from "./config";

export async function getThemePreference() {
  const store = await cookies();
  return resolveThemePreference({
    theme: store.get(THEME_COOKIE)?.value,
    mode: store.get(THEME_MODE_COOKIE)?.value,
  });
}

export async function setThemeCookies(theme: Theme, mode: ThemeMode) {
  const store = await cookies();
  const options = {
    // The preference is not sensitive; readable cookies let the UI and tests inspect it.
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE,
  };

  store.set(THEME_COOKIE, theme, options);
  store.set(THEME_MODE_COOKIE, mode, options);
}

export async function syncThemeCookiesForUser(
  user: { theme?: string | null; themeMode?: string | null } | null | undefined,
) {
  const preference = resolveThemePreference({
    theme: user?.theme,
    mode: user?.themeMode,
  });
  await setThemeCookies(preference.theme, preference.mode);
}
