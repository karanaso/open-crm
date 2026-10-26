"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { setThemeAction } from "@/actions/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  isTheme,
  isThemeMode,
  THEMES,
  THEME_LABEL_KEYS,
  THEME_MODE_LABEL_KEYS,
  THEME_MODES,
  type Theme,
  type ThemeMode,
} from "@/lib/theme/config";

export function ThemeMenu({ theme, themeMode }: { theme: Theme; themeMode: ThemeMode }) {
  const t = useTranslations("themes");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const ModeIcon = themeMode === "dark" ? Moon : themeMode === "light" ? Sun : Monitor;

  function update(nextTheme: Theme, nextMode: ThemeMode) {
    startTransition(async () => {
      await setThemeAction(nextTheme, nextMode);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("quickMenu")} disabled={pending}>
          <ModeIcon aria-hidden="true" className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("modeLabel")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={themeMode}
          onValueChange={(value) => {
            if (isThemeMode(value)) update(theme, value);
          }}
        >
          {THEME_MODES.map((mode) => (
            <DropdownMenuRadioItem key={mode} value={mode}>
              {t(THEME_MODE_LABEL_KEYS[mode])}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("themeLabel")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => {
            if (isTheme(value)) update(value, themeMode);
          }}
        >
          {THEMES.map((id) => (
            <DropdownMenuRadioItem key={id} value={id}>
              <span
                aria-hidden="true"
                data-theme={id}
                className="border-border bg-primary relative size-4 rounded-full border"
              >
                <span className="bg-background absolute inset-1 rounded-full" />
              </span>
              <span>{t(THEME_LABEL_KEYS[id].name)}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile">
            <Palette aria-hidden="true" className="size-4" />
            {t("openSettings")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
