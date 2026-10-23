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
  timeZone = "UTC",
  options?: Intl.DateTimeFormatOptions,
) {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone,
    ...options,
  }).format(date);
}

export function formatDateTime(
  value: Date | string | null | undefined,
  locale: Locale = "en",
  timeZone = "UTC",
  options?: Intl.DateTimeFormatOptions,
) {
  return formatDate(value, locale, timeZone, {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  });
}

export function formatNumber(
  value: number | null | undefined,
  locale: Locale = "en",
  options?: Intl.NumberFormatOptions,
) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrency(
  value: number | null | undefined,
  locale: Locale = "en",
  currency = "USD",
  options?: Intl.NumberFormatOptions,
) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    ...options,
  }).format(value);
}

export function formatCurrencyUsd(
  value: number | null | undefined,
  locale: Locale = "en",
  options?: Intl.NumberFormatOptions,
) {
  return formatCurrency(value, locale, "USD", options);
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
