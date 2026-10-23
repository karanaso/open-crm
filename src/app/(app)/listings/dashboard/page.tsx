import Link from "next/link";
import type { Route } from "next";
import { getLocale } from "next-intl/server";
import { Building2, CalendarClock, Clock3, Home, KeyRound, Plus, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListingTabs } from "@/components/listings/listing-tabs";
import { getListingsTranslator } from "@/components/listings/get-listings-translator";
import { getListingsDashboard, type ListingsCurrencyTotal } from "@/lib/services/listings-dashboard";
import { formatCurrency } from "@/lib/utils";

function MetricCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: Route;
  icon: typeof Building2;
}) {
  const content = (
    <CardContent className="space-y-1 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </CardContent>
  );

  return (
    <Card>
      {href ? (
        <Link href={href} className="block hover:bg-muted/40">
          {content}
        </Link>
      ) : (
        content
      )}
    </Card>
  );
}

function CurrencyTable({
  rows,
  locale,
  totalLabel,
  suffix,
  emptyLabel,
  unitLabel,
}: {
  rows: ListingsCurrencyTotal[];
  locale: Awaited<ReturnType<typeof getLocale>>;
  totalLabel: string;
  suffix: string;
  emptyLabel: string;
  unitLabel?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{suffix}</TableHead>
          <TableHead>{totalLabel}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.currency}>
            <TableCell className="font-medium">{row.currency}</TableCell>
            <TableCell>
              {formatCurrency(row.total, locale, row.currency)}
              {unitLabel ? (
                <span className="text-xs text-muted-foreground"> {unitLabel}</span>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function ListingsDashboardPage() {
  const t = await getListingsTranslator();
  const locale = await getLocale();
  const data = await getListingsDashboard();
  const saleCount = data.activeByTransaction.find((row) => row.transaction === "sale")?.count ?? 0;
  const rentCount = data.activeByTransaction.find((row) => row.transaction === "rent")?.count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("overviewTitle")}
        description={t("overviewDescription")}
        actions={
          <Button asChild>
            <Link href="/listings/new">
              <Plus className="size-4" /> {t("newListing")}
            </Link>
          </Button>
        }
      />

      <ListingTabs active="overview" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label={t("dashboard.activeListings")}
          value={String(data.activeTotal)}
          href="/listings?status=active"
          icon={Building2}
        />
        <MetricCard
          label={t("dashboard.saleListings")}
          value={String(saleCount)}
          href="/listings?transaction=sale&status=active"
          icon={Home}
        />
        <MetricCard
          label={t("dashboard.rentListings")}
          value={String(rentCount)}
          href="/listings?transaction=rent&status=active"
          icon={KeyRound}
        />
        <MetricCard
          label={t("dashboard.newThisMonth")}
          value={String(data.newThisMonth)}
          href="/listings?status=active&sort=listed_at"
          icon={TrendingUp}
        />
        <MetricCard
          label={t("dashboard.upcomingViewings")}
          value={String(data.upcomingViewings)}
          icon={CalendarClock}
        />
        <MetricCard
          label={t("dashboard.aging")}
          value={String(data.agingCount)}
          hint={t("dashboard.agingHint", { days: data.agingThresholdDays })}
          href="/listings?status=active&sort=listed_at"
          icon={Clock3}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.askingSaleValue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CurrencyTable
              rows={data.askingSaleValue}
              locale={locale}
              totalLabel={t("dashboard.total")}
              suffix={t("currency")}
              emptyLabel={t("dashboard.noSaleValue")}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              {t("dashboard.perCurrencyNote")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.monthlyRentRoll")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CurrencyTable
              rows={data.monthlyRentRoll}
              locale={locale}
              totalLabel={t("dashboard.total")}
              suffix={t("currency")}
              unitLabel={t("perMonth")}
              emptyLabel={t("dashboard.noRentRoll")}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              {t("dashboard.perCurrencyNote")}
            </p>
          </CardContent>
        </Card>
      </div>

      {data.activeTotal === 0 ? (
        <EmptyState
          icon={Building2}
          title={t("listingsEmptyTitle")}
          description={t("listingsEmptyDescription")}
          action={
            <Button asChild>
              <Link href="/listings/new">{t("newListing")}</Link>
            </Button>
          }
        />
      ) : null}

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/listings?status=active&transaction=sale"
          className="font-medium text-primary hover:underline"
        >
          {t("dashboard.viewSaleInventory")}
        </Link>
        <Link
          href="/listings?status=active&transaction=rent"
          className="font-medium text-primary hover:underline"
        >
          {t("dashboard.viewRentInventory")}
        </Link>
      </div>
    </div>
  );
}
