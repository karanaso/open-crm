import { getLocale } from "next-intl/server";
import {
  dateKeyInTimeZone,
  datePartsInTimeZone,
  formatZonedTime,
} from "@/components/listings/zoned-datetime";
import type { ViewingListItem } from "@/lib/services/listing-viewings";
import { cn } from "@/lib/utils";
import { getListingsTranslator } from "@/components/listings/get-listings-translator";

const WEEKS_REFERENCE = Date.UTC(2024, 0, 7); // A Sunday, used for weekday labels.

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export async function ViewingsCalendar({
  viewings,
  timeZone,
}: {
  viewings: ViewingListItem[];
  timeZone: string;
}) {
  const t = await getListingsTranslator();
  const locale = await getLocale();
  const today = datePartsInTimeZone(new Date(), timeZone);
  const year = today?.year ?? new Date().getUTCFullYear();
  const month = today?.month ?? new Date().getUTCMonth() + 1;

  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const byDay = new Map<string, ViewingListItem[]>();
  for (const viewing of viewings) {
    const key = dateKeyInTimeZone(viewing.scheduledAt, timeZone);
    if (!key) continue;
    byDay.set(key, [...(byDay.get(key) ?? []), viewing]);
  }
  for (const entries of byDay.values()) {
    entries.sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime());
  }

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 15)));

  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
      new Date(WEEKS_REFERENCE + index * 86_400_000),
    ),
  );

  const cells = Array.from({ length: totalCells }, (_, index) => {
    const day = index - firstWeekday + 1;
    if (day < 1 || day > daysInMonth) return { day: null, viewings: [] as ViewingListItem[] };
    const key = `${year}-${pad(month)}-${pad(day)}`;
    return { day, viewings: byDay.get(key) ?? [] };
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{t("viewings.calendar")}</h3>
        <p className="text-xs text-muted-foreground">{monthLabel}</p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[560px] table-fixed border-collapse text-sm">
          <caption className="sr-only">
            {t("viewings.calendarLabel", { month: monthLabel })}
          </caption>
          <thead>
            <tr className="bg-muted/50">
              {weekdayLabels.map((label) => (
                <th key={label} scope="col" className="px-1 py-1.5 text-xs font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: totalCells / 7 }, (_, week) => (
              <tr key={week}>
                {cells.slice(week * 7, week * 7 + 7).map((cell, index) => (
                  <td
                    key={index}
                    className={cn(
                      "h-20 border-t border-l p-1 align-top first:border-l-0",
                      cell.day === null && "bg-muted/20",
                    )}
                  >
                    {cell.day ? (
                      <>
                        <p className="text-xs text-muted-foreground">{cell.day}</p>
                        <ul className="mt-1 space-y-0.5">
                          {cell.viewings.map((viewing) => (
                            <li
                              key={viewing.id}
                              className="truncate rounded bg-info/10 px-1 py-0.5 text-[11px] text-info"
                              title={`${viewing.contactName} · ${formatZonedTime(
                                viewing.scheduledAt,
                                locale,
                                timeZone,
                              )}`}
                            >
                              {formatZonedTime(viewing.scheduledAt, locale, timeZone)}{" "}
                              {viewing.contactName}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("viewings.timeZoneHint", { timeZone })}
      </p>
    </div>
  );
}