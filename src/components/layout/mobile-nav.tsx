"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { APP_NAME } from "@/lib/constants";

export function MobileNav() {
  const t = useTranslations("nav");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("openNavigation")}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar p-4">
        <SheetHeader className="sr-only">
          <SheetTitle>
            {APP_NAME} {t("navigation")}
          </SheetTitle>
        </SheetHeader>
        <SidebarNav />
      </SheetContent>
    </Sheet>
  );
}
