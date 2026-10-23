import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "./config";

const messages = {
  en: () => import("../../messages/en.json").then((module) => module.default),
  el: () => import("../../messages/el.json").then((module) => module.default),
} as const;

export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });

  return {
    locale,
    messages: await messages[locale](),
  };
});
