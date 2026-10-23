import { LISTING_FEATURE_GROUPS } from "@/lib/listing-features";

export type ListingFeaturesValue = Record<string, Record<string, boolean>>;

/** Flatten stored features into `group.key` identifiers. */
export function flattenFeatureSelection(
  features: ListingFeaturesValue | null | undefined,
): Set<string> {
  const selected = new Set<string>();
  for (const [group, keys] of Object.entries(features ?? {})) {
    for (const [key, value] of Object.entries(keys ?? {})) {
      if (value) selected.add(`${group}.${key}`);
    }
  }
  return selected;
}

/** Serialize selected `group.key` identifiers in catalog order. */
export function serializeFeatureSelection(
  selected: ReadonlySet<string>,
): ListingFeaturesValue {
  const result: ListingFeaturesValue = {};
  for (const group of LISTING_FEATURE_GROUPS) {
    for (const feature of group.features) {
      if (!selected.has(`${group.id}.${feature.key}`)) continue;
      result[group.id] = { ...result[group.id], [feature.key]: true };
    }
  }
  return result;
}

/** Stored features that belong to a known catalog group, in catalog order. */
export function selectedFeaturesByGroup(features: ListingFeaturesValue | null | undefined) {
  return LISTING_FEATURE_GROUPS.map((group) => ({
    group,
    features: group.features.filter((feature) => features?.[group.id]?.[feature.key]),
  })).filter((entry) => entry.features.length > 0);
}

/** Catalog label keys are stored with the `listings.` prefix. */
export function featureMessageKey(labelKey: string) {
  return labelKey.replace(/^listings\./, "");
}
