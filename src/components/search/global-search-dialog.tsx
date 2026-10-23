"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Handshake, LifeBuoy, Megaphone, Users } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { GlobalSearchResults, SearchResult } from "@/lib/services/search";

const emptyResults: GlobalSearchResults = {
  companies: [],
  contacts: [],
  deals: [],
  tickets: [],
  campaigns: [],
};

const groups: Array<{
  key: keyof GlobalSearchResults;
  labelKey: "companies" | "contacts" | "deals" | "tickets" | "campaigns";
  icon: typeof Building2;
}> = [
  { key: "companies", labelKey: "companies", icon: Building2 },
  { key: "contacts", labelKey: "contacts", icon: Users },
  { key: "deals", labelKey: "deals", icon: Handshake },
  { key: "tickets", labelKey: "tickets", icon: LifeBuoy },
  { key: "campaigns", labelKey: "campaigns", icon: Megaphone },
];

export function GlobalSearchDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (href: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);
  const t = useTranslations("common");
  const tNav = useTranslations("nav");

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(emptyResults);
      return;
    }
  }, [open]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults(emptyResults);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        setResults((await response.json()) as GlobalSearchResults);
      } catch (error) {
        if ((error as Error).name !== "AbortError") console.error(error);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const hasResults = Object.values(results).some((group) => group.length > 0);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={t("searchDialogPlaceholder")}
      />
      <CommandList>
        {query.trim().length < 2 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("searchMinChars")}
          </p>
        ) : loading && !hasResults ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("searching")}</p>
        ) : (
          <CommandEmpty>{t("noResults")}</CommandEmpty>
        )}
        {groups.map((group) => {
          const items = results[group.key];
          if (items.length === 0) return null;
          const Icon = group.icon;
          return (
            <CommandGroup key={group.key} heading={tNav(group.labelKey)}>
              {items.map((item: SearchResult) => (
                <CommandItem
                  key={item.id}
                  value={`${tNav(group.labelKey)} ${item.title} ${item.subtitle}`}
                  onSelect={() => onSelect(item.href)}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
