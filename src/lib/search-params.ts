import type { Route } from "next";

export type SearchParams = Record<string, string | string[] | undefined>;

export function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function getStringArray(params: SearchParams, key: string) {
  const value = params[key];
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).flatMap((item) => item.split(",")).filter(Boolean);
}

export function getPage(params: SearchParams, defaultPage = 1) {
  const raw = getParam(params, "page");
  const page = raw ? Number.parseInt(raw, 10) : defaultPage;
  return Number.isFinite(page) && page > 0 ? page : defaultPage;
}

export function getPageSize(params: SearchParams, defaultSize = 20, max = 100) {
  const raw = getParam(params, "pageSize");
  const size = raw ? Number.parseInt(raw, 10) : defaultSize;
  return Number.isFinite(size) && size > 0 ? Math.min(size, max) : defaultSize;
}

export function buildQueryString(params: SearchParams, overrides: SearchParams = {}) {
  const search = new URLSearchParams();
  const merged = { ...params, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) if (item) search.append(key, item);
    } else {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function buildHref(pathname: string, params: SearchParams, overrides: SearchParams = {}) {
  return `${pathname}${buildQueryString(params, overrides)}` as Route;
}

export function pageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}
