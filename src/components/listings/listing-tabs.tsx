import Link from "next/link";
import type { Route } from "next";
import { BarChart3, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getListingsTranslator } from "@/components/listings/get-listings-translator";

export async function ListingTabs({ active }: { active: "inventory" | "overview" }) {
  const t = await getListingsTranslator();
  const tabs = [
    { href: "/listings" as Route, label: t("inventory"), icon: Building2, key: "inventory" },
    {
      href: "/listings/dashboard" as Route,
      label: t("overview"),
      icon: BarChart3,
      key: "overview",
    },
  ];

  return (
    <nav aria-label={t("tabsLabel")} className="flex gap-1 border-b">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium",
              selected
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}