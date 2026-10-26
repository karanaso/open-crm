"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { setThemeAction } from "@/actions/theme";
import { FormError } from "@/components/ui/form-field";
import type { MessageDescriptor } from "@/lib/errors";
import {
  THEMES,
  THEME_LABEL_KEYS,
  THEME_MODE_LABEL_KEYS,
  THEME_MODES,
  type Theme,
  type ThemeMode,
} from "@/lib/theme/config";
import { cn } from "@/lib/utils";

export function ThemePicker({ theme, themeMode }: { theme: Theme; themeMode: ThemeMode }) {
  const t = useTranslations("themes");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useState({ theme, mode: themeMode });
  const [error, setError] = useState<MessageDescriptor | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSelection({ theme, mode: themeMode });
  }, [theme, themeMode]);

  function update(next: { theme: Theme; mode: ThemeMode }) {
    setSelection(next);
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await setThemeAction(next.theme, next.mode);
      if ("error" in result) {
        setError(result.error ?? null);
        setSelection({ theme, mode: themeMode });
        return;
      }

      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <FormError message={error} />
      {saved ? (
        <p role="status" className="text-success text-sm">
          {t("saved")}
        </p>
      ) : null}

      <fieldset className="space-y-3" aria-describedby="theme-picker-description">
        <legend className="text-sm font-medium">{t("themeLabel")}</legend>
        <p id="theme-picker-description" className="text-muted-foreground text-sm">
          {t("themeDescription")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {THEMES.map((id) => {
            const checked = selection.theme === id;
            return (
              <label
                key={id}
                className={cn(
                  "focus-within:ring-ring focus-within:ring-offset-background flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-offset-2",
                  checked ? "border-primary bg-primary/5" : "hover:bg-accent/50",
                  pending && "cursor-not-allowed opacity-70",
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value={id}
                  checked={checked}
                  disabled={pending}
                  onChange={() => update({ theme: id, mode: selection.mode })}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  data-theme={id}
                  className="border-border bg-primary relative size-8 shrink-0 rounded-full border"
                >
                  <span className="bg-background absolute inset-2 rounded-full" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{t(THEME_LABEL_KEYS[id].name)}</span>
                  <span className="text-muted-foreground block text-xs">
                    {t(THEME_LABEL_KEYS[id].description)}
                  </span>
                </span>
                {checked ? (
                  <Check aria-hidden="true" className="text-primary ml-auto size-4 shrink-0" />
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-3" aria-describedby="theme-mode-description">
        <legend className="text-sm font-medium">{t("modeLabel")}</legend>
        <p id="theme-mode-description" className="text-muted-foreground text-sm">
          {t("modeDescription")}
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {THEME_MODES.map((mode) => {
            const checked = selection.mode === mode;
            return (
              <label
                key={mode}
                className={cn(
                  "focus-within:ring-ring focus-within:ring-offset-background flex cursor-pointer items-center justify-between gap-2 rounded-lg border p-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-offset-2",
                  checked ? "border-primary bg-primary/5" : "hover:bg-accent/50",
                  pending && "cursor-not-allowed opacity-70",
                )}
              >
                <input
                  type="radio"
                  name="theme-mode"
                  value={mode}
                  checked={checked}
                  disabled={pending}
                  onChange={() => update({ theme: selection.theme, mode })}
                  className="sr-only"
                />
                <span>{t(THEME_MODE_LABEL_KEYS[mode])}</span>
                {checked ? <Check aria-hidden="true" className="text-primary size-4" /> : null}
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
