export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeDomain(value: string | null | undefined) {
  if (!value) return null;
  let domain = value.trim().toLowerCase();
  if (!domain) return null;
  domain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "");
  domain = domain.split("/")[0].split("?")[0].split("#")[0];
  domain = domain.replace(/:\d+$/, "");
  return domain || null;
}

export function normalizeTag(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeTags(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const tag = normalizeTag(value);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }
  return result;
}

export function normalizePhone(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
}
