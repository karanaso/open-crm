"use client";

import { useTranslations } from "next-intl";
import type { MessageDescriptor } from "@/lib/errors";

export function useMessageTranslator() {
  const t = useTranslations();
  const translate = t as unknown as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;

  return (message: string | MessageDescriptor) =>
    typeof message === "string" ? translate(message) : translate(message.key, message.params);
}
