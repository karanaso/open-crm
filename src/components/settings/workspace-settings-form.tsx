"use client";

import { useActionState, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { updateWorkspaceSettingsAction } from "@/actions/workspace-settings";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import type { ActionState } from "@/lib/action-state";

type Translator = (key: string, values?: Record<string, string | number>) => string;

const FALLBACK_CURRENCIES = ["EUR", "GBP", "USD"];
const FALLBACK_TIME_ZONES = [
  "UTC",
  "Europe/Athens",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Australia/Sydney",
];

function supportedValues(kind: "currency" | "timeZone", fallback: string[], current: string) {
  let values: string[] = fallback;
  if (typeof Intl.supportedValuesOf === "function") {
    try {
      values = Intl.supportedValuesOf(kind);
    } catch {
      values = fallback;
    }
  }
  const merged = new Set([...values, ...fallback]);
  if (current) merged.add(current);
  return [...merged].sort();
}

export function WorkspaceSettingsForm({
  defaultCurrency,
  timeZone,
}: {
  defaultCurrency: string;
  timeZone: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateWorkspaceSettingsAction,
    null,
  );
  const t = useTranslations("settings") as unknown as Translator;
  const tCommon = useTranslations("common");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [zone, setZone] = useState(timeZone);
  const currencies = useMemo(
    () => supportedValues("currency", FALLBACK_CURRENCIES, currency),
    [currency],
  );
  const timeZones = useMemo(() => supportedValues("timeZone", FALLBACK_TIME_ZONES, zone), [zone]);

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state?.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={t("defaultCurrency")}
          htmlFor="defaultCurrency"
          error={state?.fieldErrors?.defaultCurrency?.[0]}
          hint={t("defaultCurrencyHint")}
          required
        >
          <select
            id="defaultCurrency"
            name="defaultCurrency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            required
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          >
            {currencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label={t("timeZone")}
          htmlFor="timeZone"
          error={state?.fieldErrors?.timeZone?.[0]}
          hint={t("timeZoneHint")}
          required
        >
          <select
            id="timeZone"
            name="timeZone"
            value={zone}
            onChange={(event) => setZone(event.target.value)}
            required
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          >
            {timeZones.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <p className="text-muted-foreground text-xs">{t("workspaceSettingsHint")}</p>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? tCommon("saving") : tCommon("saveChanges")}
        </Button>
      </div>
    </form>
  );
}
