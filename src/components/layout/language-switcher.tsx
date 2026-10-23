"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocaleAction } from "@/actions/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(next: string) {
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <Select value={locale} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className={className} aria-label={t("language")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">{t("english")}</SelectItem>
        <SelectItem value="el">{t("greek")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
