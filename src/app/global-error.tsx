"use client";

import { useEffect, useState } from "react";
import { createTranslator } from "next-intl";
import en from "../../messages/en.json";
import el from "../../messages/el.json";
import { GlobalErrorContent, GlobalErrorView } from "@/components/error-pages/global-error-view";
import { defaultLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { readCookieValue, resolveGlobalErrorLocale } from "@/i18n/global-error-locale";
import { logPageError } from "@/lib/page-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const cookieValue =
      typeof document === "undefined" ? undefined : readCookieValue(document.cookie, LOCALE_COOKIE);
    const browserLanguage = typeof navigator === "undefined" ? undefined : navigator.language;
    setLocale(resolveGlobalErrorLocale(cookieValue, browserLanguage));
    logPageError(error);
  }, [error]);

  const t = createTranslator({
    locale,
    messages: locale === "el" ? el : en,
    namespace: "errorPages",
  });

  return (
    <GlobalErrorView locale={locale}>
      <GlobalErrorContent
        title={t("title")}
        description={t("description")}
        retryLabel={t("retry")}
        onRetry={() => reset()}
      />
    </GlobalErrorView>
  );
}
