export {
  formatDate,
  formatDateTime,
  formatDurationHours,
} from "@/i18n/format";

export function todayUtc(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function isDateBeforeToday(value: string, now = new Date()) {
  return value < todayUtc(now);
}

export function isDateAfterDays(value: string, days: number, now = new Date()) {
  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() + days);
  return value <= target.toISOString().slice(0, 10);
}

export function startOfMonthUtc(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function daysBetween(start: Date | string, end: Date | string) {
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
}
