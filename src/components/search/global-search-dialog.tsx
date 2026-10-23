"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Building2, Handshake, House, LifeBuoy, Megaphone, Users } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { formatCurrency, formatNumber } from "@/i18n/format";
import type { GlobalSearchResults, SearchResult } from "@/lib/services/search";

const emptyResults: GlobalSearchResults = {
  companies: [],
  contacts: [],
  deals: [],
  listings: [],
  tickets: [],
  campaigns: [],
};

const groups: Array<{
  key: keyof GlobalSearchResults;
  labelKey: "companies" | "contacts" | "deals" | "listings" | "tickets" | "campaigns";
  icon: typeof Building2;
}> = [
  { key: "companies", labelKey: "companies", icon: Building2 },
  { key: "contacts", labelKey: "contacts", icon: Users },
  { key: "deals", labelKey: "deals", icon: Handshake },
  { key: "listings", labelKey: "listings", icon: House },
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
  const tNav = useTranslations("nav") as unknown as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;
  const tEnums = useTranslations("enums");
  const tListings = useTranslations("listings") as unknown as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;
  const locale = useLocale();

  function resultSubtitle(item: SearchResult, groupKey: keyof GlobalSearchResults) {
    const parts: string[] = [];
    if (groupKey === "campaigns") parts.push(t("campaign"));
    if (item.subtitle) parts.push(item.subtitle);
    if (item.amount) {
      parts.push(
        item.currency
          ? formatCurrency(Number(item.amount), locale, item.currency)
          : formatNumber(Number(item.amount), locale),
      );
    }
    if (item.status) {
      if (groupKey === "listings") {
        parts.push(tListings(`enums.status.${item.status}`));
      } else {
        const group = groupKey === "tickets" ? "ticketStatus" : "campaignStatus";
        parts.push(tEnums(`${group}.${item.status}` as never));
      }
    }
    if (groupKey === "companies" && !item.subtitle) parts.push(t("company"));
    return parts.join(" · ");
  }

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
          <p className="text-muted-foreground py-6 text-center text-sm">{t("searchMinChars")}</p>
        ) : loading && !hasResults ? (
          <p className="text-muted-foreground py-6 text-center text-sm">{t("searching")}</p>
        ) : (
          <CommandEmpty>{t("noResults")}</CommandEmpty>
        )}
        {groups.map((group) => {
          const items = results[group.key];
          if (items.length === 0) return null;
          const Icon = group.icon;
          return (
            <CommandGroup key={group.key} heading={tNav(group.labelKey)}>
              {items.map((item: SearchResult) => {
                const subtitle = resultSubtitle(item, group.key);
                return (
                  <CommandItem
                    key={item.id}
                    value={`${tNav(group.labelKey)} ${item.title} ${subtitle}`}
                    onSelect={() => onSelect(item.href)}
                  >
                    <Icon className="text-muted-foreground size-4" />
                    <div className="min-w-0">
                      <p className="truncate">{item.title}</p>
                      <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
