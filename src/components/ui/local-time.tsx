"use client";

import { useEffect, useState } from "react";

export function LocalTime({
  value,
  options,
  fallback = "—",
}: {
  value: Date | string | null | undefined;
  options?: Intl.DateTimeFormatOptions;
  fallback?: string;
}) {
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setFormatted(fallback);
      return;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      setFormatted(fallback);
      return;
    }
    setFormatted(
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
        ...options,
      }).format(date),
    );
  }, [fallback, options, value]);

  if (!formatted) {
    const date = value ? (value instanceof Date ? value : new Date(value)) : null;
    const utc = date && !Number.isNaN(date.getTime()) ? date.toISOString().replace("T", " ").slice(0, 16) + " UTC" : fallback;
    return (
      <time dateTime={date?.toISOString()} suppressHydrationWarning>
        {utc}
      </time>
    );
  }

  return (
    <time dateTime={value ? new Date(value).toISOString() : undefined} suppressHydrationWarning>
      {formatted}
    </time>
  );
}

export function DateDisplay({ value, fallback = "—" }: { value: string | Date | null | undefined; fallback?: string }) {
  if (!value) return <span>{fallback}</span>;
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return <span>{fallback}</span>;
  return (
    <span>
      {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(date)}
    </span>
  );
}
