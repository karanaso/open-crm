import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDurationHours,
  isDateAfterDays,
  isDateBeforeToday,
  todayUtc,
} from "@/lib/dates";

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
});
