import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDurationHours,
  isDateAfterDays,
  isDateBeforeToday,
  todayUtc,
} from "@/lib/dates";
import { formatCurrencyUsd, formatDate, formatDateTime } from "@/i18n/format";
import { formatCurrency, formatNumber } from "@/lib/utils";

const now = new Date("2026-10-21T12:00:00Z");

describe("date helpers", () => {
  it("formats UTC dates", () => {
    expect(todayUtc(now)).toBe("2026-10-21");
  });

  it("compares due dates with today", () => {
    expect(isDateBeforeToday("2026-10-20", now)).toBe(true);
    expect(isDateBeforeToday("2026-10-21", now)).toBe(false);
  });

  it("checks the upcoming window", () => {
    expect(isDateAfterDays("2026-10-27", 7, now)).toBe(true);
    expect(isDateAfterDays("2026-10-29", 7, now)).toBe(false);
  });

  it("adds days without mutating the input", () => {
    const result = addDays(now, 5);
    expect(result.toISOString().slice(0, 10)).toBe("2026-10-26");
    expect(now.toISOString().slice(0, 10)).toBe("2026-10-21");
  });

  it("formats durations", () => {
    expect(formatDurationHours(0.5)).toBe("30m");
    expect(formatDurationHours(4)).toBe("4.0h");
    expect(formatDurationHours(48)).toBe("2.0d");
  });

  it("formats Greek dates and currency", () => {
    expect(formatDate("2026-10-21T23:30:00Z", "el")).toContain("21");
    expect(formatDate("2026-10-21T23:30:00Z", "el")).toContain("Οκτ");
    expect(formatDate("2026-10-21T23:30:00Z", "el")).toContain("2026");
    expect(formatCurrencyUsd(1234.5, "el")).toContain("1.234,50");
    expect(formatCurrencyUsd(1234.5, "el")).toContain("$");
  });

  it("formats Greek durations", () => {
    expect(formatDurationHours(0.5, "el")).toBe("30λ");
    expect(formatDurationHours(4, "el")).toBe("4,0ώ");
    expect(formatDurationHours(48, "el")).toBe("2,0ημ");
  });

  it("formats shared currency and numbers by locale", () => {
    expect(formatCurrency(1234.5, "el")).toContain("1.234,50");
    expect(formatNumber(1234.5, "el")).toBe("1.234,5");
  });

  it("formats per-record currencies and workspace time zones", () => {
    expect(formatCurrency(1234.5, "en", "USD")).toContain("$");
    expect(formatCurrency(1234.5, "en", "EUR")).toContain("€");
    expect(formatCurrency(1234.5, "el", "EUR")).toContain("1.234,50");
    expect(formatDate("2026-10-21T23:30:00Z", "en", "UTC")).toContain("21");
    expect(formatDate("2026-10-21T23:30:00Z", "en", "Europe/Athens")).toContain("22");
    expect(formatDateTime("2026-10-21T23:30:00Z", "en", "Europe/Athens")).toContain("2:30");
  });
});
