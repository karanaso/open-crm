"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { logPageError } from "@/lib/page-error";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorPages");

  useEffect(() => {
    logPageError(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset}>{t("retry")}</Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">{t("backToDashboard")}</Link>
        </Button>
      </div>
    </div>
  );
}
