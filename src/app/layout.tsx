import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { RootDocument } from "@/components/layout/root-document";
import { APP_NAME } from "@/lib/constants";
import { getThemePreference } from "@/lib/theme/cookie";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: {
      default: t("title"),
      template: `%s · ${APP_NAME}`,
    },
    description: t("description"),
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locale, messages, themePreference] = await Promise.all([
    getLocale(),
    getMessages(),
    getThemePreference(),
  ]);

  return (
    <RootDocument
      locale={locale}
      messages={messages}
      theme={themePreference.theme}
      themeMode={themePreference.mode}
    >
      {children}
    </RootDocument>
  );
}
