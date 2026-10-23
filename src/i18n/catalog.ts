export type Catalog = Record<string, unknown>;

export type CatalogIssue = {
  type: "missing" | "extra" | "empty" | "placeholder";
  locale: string;
  key: string;
  detail?: string;
};

export function flattenCatalog(catalog: Catalog, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();

  for (const [key, value] of Object.entries(catalog)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of flattenCatalog(value as Catalog, path)) {
        result.set(nestedKey, nestedValue);
      }
    } else {
      result.set(path, typeof value === "string" ? value : String(value));
    }
  }

  return result;
}

export function extractPlaceholders(value: string): string[] {
  const placeholders = new Set<string>();
  for (const match of value.matchAll(/\{\s*([a-zA-Z0-9_]+)/g)) {
    placeholders.add(match[1]);
  }
  return [...placeholders].sort();
}

export function compareCatalogs(
  source: Catalog,
  target: Catalog,
  sourceLocale = "en",
  targetLocale = "el",
): CatalogIssue[] {
  const sourceFlat = flattenCatalog(source);
  const targetFlat = flattenCatalog(target);
  const issues: CatalogIssue[] = [];

  for (const [key, value] of sourceFlat) {
    if (value.trim().length === 0) {
      issues.push({ type: "empty", locale: sourceLocale, key });
    }
    if (!targetFlat.has(key)) {
      issues.push({ type: "missing", locale: targetLocale, key });
      continue;
    }

    const targetValue = targetFlat.get(key) ?? "";
    if (targetValue.trim().length === 0) {
      issues.push({ type: "empty", locale: targetLocale, key });
    }

    const sourcePlaceholders = extractPlaceholders(value);
    const targetPlaceholders = extractPlaceholders(targetValue);
    if (sourcePlaceholders.join(",") !== targetPlaceholders.join(",")) {
      issues.push({
        type: "placeholder",
        locale: targetLocale,
        key,
        detail: `expected {${sourcePlaceholders.join("}, {")}}, found {${targetPlaceholders.join("}, {")}}`,
      });
    }
  }

  for (const key of targetFlat.keys()) {
    if (!sourceFlat.has(key)) {
      issues.push({ type: "extra", locale: targetLocale, key });
    }
  }

  return issues;
}
