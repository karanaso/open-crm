import type { AbstractIntlMessages } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { ThemeRuntime } from "@/components/theme/theme-runtime";
import { Toaster } from "@/components/ui/sonner";
import type { Locale } from "@/i18n/config";
import type { Theme, ThemeMode } from "@/lib/theme/config";

const SYSTEM_THEME_SCRIPT = `(function(){var d=document.documentElement;if(d.dataset.mode!=="system")return;var m=window.matchMedia("(prefers-color-scheme: dark)");d.classList.toggle("dark",m.matches);})();`;

export function RootDocument({
  locale,
  messages,
  theme,
  themeMode,
  children,
}: {
  locale: Locale;
  messages: AbstractIntlMessages;
  theme: Theme;
  themeMode: ThemeMode;
  children: React.ReactNode;
}) {
  return (
    <html
      lang={locale}
      data-theme={theme}
      data-mode={themeMode}
      className={themeMode === "dark" ? "dark" : undefined}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <script dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <ThemeRuntime mode={themeMode} />
          <Toaster mode={themeMode} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
