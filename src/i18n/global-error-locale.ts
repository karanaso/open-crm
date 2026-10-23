import { resolveLocale, type Locale } from "./config";

export function readCookieValue(cookieString: string, name: string): string | undefined {
  for (const part of cookieString.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key !== name) continue;
    const value = rest.join("=");
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return undefined;
}

export function resolveGlobalErrorLocale(
  cookieValue: string | null | undefined,
  navigatorLanguage?: string | null,
): Locale {
  return resolveLocale({ cookie: cookieValue, acceptLanguage: navigatorLanguage });
}
