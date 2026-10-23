import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({
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
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Showing {start}-{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild disabled={page <= 1}>
          <Link href={buildHref(Math.max(1, page - 1))} aria-disabled={page <= 1}>
            <ChevronLeft className="size-4" /> Previous
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {page} of {Math.max(1, pageCount)}
        </span>
        <Button variant="outline" size="sm" asChild disabled={page >= pageCount}>
          <Link href={buildHref(Math.min(pageCount, page + 1))} aria-disabled={page >= pageCount}>
            Next <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
