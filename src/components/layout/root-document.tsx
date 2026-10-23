import type { AbstractIntlMessages } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "@/i18n/config";

export function RootDocument({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: AbstractIntlMessages;
  children: React.ReactNode;
}) {
  return (
    <html lang={locale}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
