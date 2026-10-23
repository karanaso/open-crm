import { Badge } from "@/components/ui/badge";
import { getListingsTranslator } from "@/components/listings/get-listings-translator";
import {
  featureMessageKey,
  selectedFeaturesByGroup,
  type ListingFeaturesValue,
} from "@/components/listings/feature-catalog";

export async function ListingFeatures({ features }: { features: ListingFeaturesValue }) {
  const t = await getListingsTranslator();
  const groups = selectedFeaturesByGroup(features);

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noFeatures")}</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map(({ group, features: selected }) => (
        <div key={group.id} className="space-y-2">
          <h3 className="text-sm font-medium">{t(featureMessageKey(group.labelKey))}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {selected.map((feature) => (
              <li key={feature.key}>
                <Badge variant="outline">{t(featureMessageKey(feature.labelKey))}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}