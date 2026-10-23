import { getLocale, getTranslations } from "next-intl/server";
import { CalendarPlus, CalendarX2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ViewingStatusBadge } from "@/components/listings/listing-badges";
import { ViewingForm } from "@/components/listings/viewing-form";
import { ViewingStatusActions } from "@/components/listings/viewing-status-actions";
import { ViewingsCalendar } from "@/components/listings/viewings-calendar";
import { formatDateTime } from "@/i18n/format";
import type { ViewingListItem } from "@/lib/services/listing-viewings";
import type { User } from "@/db/schema";
import { getListingsTranslator } from "@/components/listings/get-listings-translator";

type ContactOption = { id: string; firstName: string; lastName: string };

function ViewingTable({
  viewings,
  emptyTitle,
  timeZone,
  returnTo,
  contactLabel,
  dateLabel,
  durationLabel,
  agentLabel,
  inactiveLabel,
  statusLabel,
  notesLabel,
  actionsLabel,
  minutesLabel,
  locale,
}: {
  viewings: ViewingListItem[];
  emptyTitle: string;
  timeZone: string;
  returnTo: string;
  contactLabel: string;
  dateLabel: string;
  durationLabel: string;
  agentLabel: string;
  inactiveLabel: string;
  statusLabel: string;
  notesLabel: string;
  actionsLabel: string;
  minutesLabel: (count: number) => string;
  locale: Awaited<ReturnType<typeof getLocale>>;
}) {
  if (viewings.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
        <CalendarX2 className="size-4" />
        {emptyTitle}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{contactLabel}</TableHead>
          <TableHead>{dateLabel}</TableHead>
          <TableHead>{durationLabel}</TableHead>
          <TableHead>{agentLabel}</TableHead>
          <TableHead>{statusLabel}</TableHead>
          <TableHead>{notesLabel}</TableHead>
          <TableHead>{actionsLabel}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {viewings.map((viewing) => (
          <TableRow key={viewing.id}>
            <TableCell>
              <p className="font-medium">{viewing.contactName}</p>
              <p className="text-xs text-muted-foreground">{viewing.contactEmail}</p>
            </TableCell>
            <TableCell>{formatDateTime(viewing.scheduledAt, locale, timeZone)}</TableCell>
            <TableCell>{minutesLabel(viewing.durationMinutes)}</TableCell>
            <TableCell>
              {viewing.agentName ?? "—"}
              {viewing.agentStatus === "inactive" ? (
                <Badge variant="outline" className="ml-2">
                  {inactiveLabel}
                </Badge>
              ) : null}
            </TableCell>
            <TableCell>
              <ViewingStatusBadge status={viewing.status} />
            </TableCell>
            <TableCell className="max-w-[16rem] text-xs whitespace-pre-wrap text-muted-foreground">
              {viewing.notes ?? "—"}
            </TableCell>
            <TableCell>
              {viewing.status === "scheduled" ? (
                <ViewingStatusActions viewingId={viewing.id} returnTo={returnTo} />
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export async function ListingViewings({
  listingId,
  returnTo,
  viewings,
  contacts,
  team,
  timeZone,
}: {
  listingId: string;
  returnTo: string;
  viewings: { items: ViewingListItem[]; upcoming: ViewingListItem[]; past: ViewingListItem[] };
  contacts: ContactOption[];
  team: User[];
  timeZone: string;
}) {
  const t = await getListingsTranslator();
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const agents = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));
  const labels = {
    contactLabel: t("viewings.contact"),
    dateLabel: t("viewings.dateTime"),
    durationLabel: t("viewings.duration"),
    agentLabel: t("viewings.agent"),
    inactiveLabel: tCommon("inactive"),
    statusLabel: tCommon("status"),
    notesLabel: t("viewings.notes"),
    actionsLabel: tCommon("actions"),
    minutesLabel: (count: number) => t("viewings.durationMinutes", { count }),
  };

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <CalendarPlus className="size-4" /> {t("viewings.title")}
        </CardTitle>
        <Badge variant="outline">
          {t("viewings.upcomingCount", { count: viewings.upcoming.length })}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <details className="rounded-lg border bg-muted/20 p-3">
          <summary className="cursor-pointer text-sm font-medium">{t("viewings.schedule")}</summary>
          <div className="mt-4">
            <ViewingForm
              listingId={listingId}
              returnTo={returnTo}
              contacts={contacts}
              agents={agents}
              timeZone={timeZone}
            />
          </div>
        </details>

        <ViewingsCalendar viewings={viewings.items} timeZone={timeZone} />

        <section className="space-y-2">
          <h3 className="text-sm font-medium">
            {t("viewings.upcoming")}{" "}
            <span className="text-muted-foreground">({viewings.upcoming.length})</span>
          </h3>
          <ViewingTable
            viewings={viewings.upcoming}
            emptyTitle={t("viewings.noUpcoming")}
            timeZone={timeZone}
            returnTo={returnTo}
            locale={locale}
            {...labels}
          />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium">
            {t("viewings.past")}{" "}
            <span className="text-muted-foreground">({viewings.past.length})</span>
          </h3>
          <ViewingTable
            viewings={viewings.past}
            emptyTitle={t("viewings.noPast")}
            timeZone={timeZone}
            returnTo={returnTo}
            locale={locale}
            {...labels}
          />
        </section>

        <p className="text-sm text-muted-foreground">{t("viewings.contactHint")}</p>
      </CardContent>
    </Card>
  );
}