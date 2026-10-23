"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Building2,
  CheckSquare,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_ITEMS } from "@/lib/constants";

const icons: Record<(typeof NAV_ITEMS)[number]["href"], LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/companies": Building2,
  "/contacts": Users,
  "/deals": Handshake,
  "/tickets": LifeBuoy,
  "/campaigns": Megaphone,
  "/tasks": CheckSquare,
  "/settings": Settings,
};

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <div className="flex h-full flex-col gap-6">
      <Link href="/dashboard" className="flex items-center gap-2 px-2" onClick={onNavigate}>
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BarChart3 className="size-4" />
        </span>
        <span className="text-base font-semibold tracking-tight">{APP_NAME}</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = icons[item.href];
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <p className="px-2 text-xs whitespace-pre-line text-muted-foreground">{t("tagline")}</p>
    </div>
  );
}
