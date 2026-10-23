import type { Locale } from "./config";

const durationUnits = {
  en: { minute: "m", hour: "h", day: "d" },
  el: { minute: "λ", hour: "ώ", day: "ημ" },
} as const;

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  value: Date | string | null | undefined,
  locale: Locale = "en",
  options?: Intl.DateTimeFormatOptions,
) {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
    ...options,
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined, locale: Locale = "en") {
  return formatDate(value, locale, { dateStyle: "medium", timeStyle: "short" });
}

export function formatNumber(
  value: number | null | undefined,
  locale: Locale = "en",
  options?: Intl.NumberFormatOptions,
) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrencyUsd(
  value: number | null | undefined,
  locale: Locale = "en",
  options?: Intl.NumberFormatOptions,
) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    ...options,
  }).format(value);
}

export function formatDurationHours(hours: number | null | undefined, locale: Locale = "en") {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) return "—";
  const units = durationUnits[locale];

  if (hours < 1) {
    return `${formatNumber(Math.round(hours * 60), locale, { maximumFractionDigits: 0 })}${units.minute}`;
  }

  if (hours < 24) {
    return `${formatNumber(hours, locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}${units.hour}`;
  }

  return `${formatNumber(hours / 24, locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}${units.day}`;
}
