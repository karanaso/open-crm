import Link from "next/link";
import type { Route } from "next";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export async function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  buildHref,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  buildHref: (page: number) => Route;
}) {
  if (total === 0) return null;
  const t = await getTranslations("common");
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const lastPage = Math.max(1, pageCount);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">{t("showing", { start, end, total })}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild disabled={page <= 1}>
          <Link href={buildHref(Math.max(1, page - 1))} aria-disabled={page <= 1}>
            <ChevronLeft className="size-4" /> {t("previous")}
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground">
          {t("pageOf", { page, pageCount: lastPage })}
        </span>
        <Button variant="outline" size="sm" asChild disabled={page >= pageCount}>
          <Link href={buildHref(Math.min(pageCount, page + 1))} aria-disabled={page >= pageCount}>
            {t("next")} <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
