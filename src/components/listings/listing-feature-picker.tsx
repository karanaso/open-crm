"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { LISTING_FEATURE_GROUPS } from "@/lib/listing-features";
import { cn } from "@/lib/utils";
import { useListingsTranslator } from "@/components/listings/use-listings-translator";
import {
  featureMessageKey,
  flattenFeatureSelection,
  serializeFeatureSelection,
  type ListingFeaturesValue,
} from "@/components/listings/feature-catalog";

export function FeaturePicker({
  name,
  initialFeatures,
}: {
  name: string;
  initialFeatures?: ListingFeaturesValue | null;
}) {
  const t = useListingsTranslator();
  const [selected, setSelected] = useState<Set<string>>(() =>
    flattenFeatureSelection(initialFeatures),
  );
  const serialized = serializeFeatureSelection(selected);

  function toggle(key: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  const total = selected.size;

  return (
    <fieldset className="space-y-3">
      <legend className="flex flex-wrap items-center gap-2 text-sm font-medium">
        {t("featurePicker.legend")}
        <Badge variant="outline">{t("featurePicker.selectedCount", { count: total })}</Badge>
      </legend>
      <input type="hidden" name={name} value={JSON.stringify(serialized)} readOnly />
      <p className="text-xs text-muted-foreground">{t("featurePicker.hint")}</p>

      <div className="space-y-2">
        {LISTING_FEATURE_GROUPS.map((group) => {
          const selectedCount = group.features.filter((feature) =>
            selected.has(`${group.id}.${feature.key}`),
          ).length;

          return (
            <details
              key={group.id}
              className="rounded-lg border bg-muted/20 px-3 py-2"
            >
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-medium">
                {t(featureMessageKey(group.labelKey))}
                {selectedCount > 0 ? <Badge variant="secondary">{selectedCount}</Badge> : null}
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.features.map((feature) => {
                  const key = `${group.id}.${feature.key}`;
                  const id = `listing-feature-${group.id}-${feature.key}`;
                  const checked = selected.has(key);
                  return (
                    <div key={key} className="flex items-start gap-2">
                      <input
                        id={id}
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => toggle(key, event.target.checked)}
                        className={cn(
                          "mt-0.5 size-4 shrink-0 rounded border-input accent-primary",
                          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        )}
                      />
                      <label htmlFor={id} className="text-sm leading-5">
                        {t(featureMessageKey(feature.labelKey))}
                      </label>
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </fieldset>
  );
}