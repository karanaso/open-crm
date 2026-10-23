"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearchDialog } from "@/components/search/global-search-dialog";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("common");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 flex-1 justify-start gap-2 bg-background font-normal text-muted-foreground sm:max-w-md"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">{t("searchPlaceholder")}</span>
        <span className="sm:hidden">{t("search")}</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] sm:inline">
          ⌘K
        </kbd>
      </Button>
      <GlobalSearchDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={(href) => {
          setOpen(false);
          router.push(href as Route);
        }}
      />
    </>
  );
}
