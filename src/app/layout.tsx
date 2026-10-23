import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { RootDocument } from "@/components/layout/root-document";
import { Toaster } from "@/components/ui/sonner";
import { APP_NAME } from "@/lib/constants";
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
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <RootDocument locale={locale} messages={messages}>
      {children}
      <Toaster />
    </RootDocument>
  );
}
