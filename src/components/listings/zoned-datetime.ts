import type { Locale } from "@/i18n/config";

const wallTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Interpret a `datetime-local` wall time in the workspace time zone and return
 * the equivalent UTC instant. Unknown zones and malformed values return null so
 * the caller can keep the server-side validation error.
 */
export function wallTimeToUtc(value: string, timeZone: string): Date | null {
  const match = wallTimePattern.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hour, minute, second = "0", milliseconds = "0"] = match;
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (monthNumber < 1 || monthNumber > 12) return null;
  if (dayNumber < 1 || dayNumber > 31) return null;
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return null;

  const calendarCheck = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));
  if (
    calendarCheck.getUTCFullYear() !== yearNumber ||
    calendarCheck.getUTCMonth() !== monthNumber - 1 ||
    calendarCheck.getUTCDate() !== dayNumber
  ) {
    return null;
  }

  const wallTime = Date.UTC(
    yearNumber,
    monthNumber - 1,
    dayNumber,
    Number(hour),
    Number(minute),
    Number(second),
    Number(milliseconds.padEnd(3, "0")),
  );

  try {
    let utc = wallTime;
    // The offset can change across a DST boundary; converge in a few passes.
    for (let pass = 0; pass < 3; pass += 1) {
      const offset = timeZoneOffsetMs(new Date(utc), timeZone);
      const next = wallTime - offset;
      if (next === utc) break;
      utc = next;
    }
    return new Date(utc);
  } catch {
    return null;
  }
}

export type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export function datePartsInTimeZone(
  value: Date | string,
  timeZone: string,
): ZonedDateParts | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const parts: Record<string, string> = {};
    for (const part of formatter.formatToParts(date)) {
      if (part.type !== "literal") parts[part.type] = part.value;
    }
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour),
      minute: Number(parts.minute),
    };
  } catch {
    return null;
  }
}

/** `YYYY-MM-DD` key for grouping records by workspace-local day. */
export function dateKeyInTimeZone(value: Date | string, timeZone: string) {
  const parts = datePartsInTimeZone(value, timeZone);
  if (!parts) return null;
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(
    2,
    "0",
  )}-${String(parts.day).padStart(2, "0")}`;
}

/** Time of day rendered in the workspace time zone. */
export function formatZonedTime(
  value: Date | string | null | undefined,
  locale: Locale,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions,
) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    ...options,
  }).format(date);
}
