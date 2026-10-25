export const MERGE_FIELDS = ["firstName", "lastName", "company"] as const;

export type MergeField = (typeof MERGE_FIELDS)[number];

export type MergeValues = Partial<Record<MergeField, string | null | undefined>>;

const MERGE_FIELD_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function isMergeField(value: string): value is MergeField {
  return (MERGE_FIELDS as readonly string[]).includes(value);
}

export function findUnsupportedMergeFields(body: string): string[] {
  const unsupported = new Set<string>();
  for (const match of body.matchAll(MERGE_FIELD_PATTERN)) {
    const name = match[1];
    if (!isMergeField(name)) unsupported.add(name);
  }
  return [...unsupported];
}

export function renderMergeFields(body: string, values: MergeValues): string {
  return body.replace(MERGE_FIELD_PATTERN, (match, rawName: string) => {
    if (!isMergeField(rawName)) return match;
    const value = values[rawName];
    return value ?? "";
  });
}
