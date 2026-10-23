import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "./config";

export async function getLocaleCookie(): Promise<Locale | undefined> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : undefined;
}

export async function setLocaleCookie(locale: Locale) {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });
}
