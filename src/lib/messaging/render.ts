export const MERGE_FIELDS = ["firstName", "lastName", "company"] as const;

export type MergeField = (typeof MERGE_FIELDS)[number];

export type MergeValues = Partial<Record<MergeField, string | null | undefined>>;

const MERGE_FIELD_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;

function isMergeField(value: string): value is MergeField {
  return (MERGE_FIELDS as readonly string[]).includes(value);
}

function fieldPattern(field: MergeField) {
  return new RegExp(`\\{\\{\\s*${field}\\s*\\}\\}`, "g");
}

function countMatches(value: string, pattern: RegExp) {
  return [...value.matchAll(pattern)].length;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function findUnsupportedMergeFields(body: string): string[] {
  const unsupported = new Set<string>();
  for (const match of body.matchAll(MERGE_FIELD_PATTERN)) {
    const name = match[1];
    if (!isMergeField(name)) unsupported.add(name);
  }
  return [...unsupported];
}

export function stripSupportedMergeFields(body: string): string {
  return body.replace(MERGE_FIELD_PATTERN, (match, rawName: string) =>
    isMergeField(rawName) ? "" : match,
  );
}

export function findSplitMergeFields(html: string, text: string): MergeField[] {
  return MERGE_FIELDS.filter((field) => {
    const pattern = fieldPattern(field);
    return countMatches(text, pattern) > countMatches(html, pattern);
  });
}

export function renderMergeFields(body: string, values: MergeValues): string {
  return body.replace(MERGE_FIELD_PATTERN, (match, rawName: string) => {
    if (!isMergeField(rawName)) return match;
    const value = values[rawName];
    return value ?? "";
  });
}

export function renderHtmlMergeFields(html: string, values: MergeValues): string {
  return html.replace(MERGE_FIELD_PATTERN, (match, rawName: string) => {
    if (!isMergeField(rawName)) return match;
    return escapeHtml(values[rawName] ?? "");
  });
}
