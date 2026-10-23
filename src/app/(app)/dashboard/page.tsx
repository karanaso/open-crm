import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, CheckSquare, Handshake, LifeBuoy, Megaphone, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { requireUser } from "@/lib/auth/guards";
import { getDashboardData } from "@/lib/services/dashboard";
import { getWorkspaceDefaults } from "@/lib/services/workspace-settings";
import { formatDurationHours } from "@/lib/dates";
import { formatNumber } from "@/lib/utils";
import { formatCurrency, formatNumber as formatLocaleNumber } from "@/i18n/format";
import type { Locale } from "@/i18n/config";

type CurrencyTotal = {
  currency: string;
  total: number;
};

type Translator = (key: string, values?: Record<string, string | number>) => string;

async function getRawTranslator(namespace: "dashboard" | "nav" | "sales" | "listings") {
  return (await getTranslations(namespace)) as unknown as Translator;
}

function percent(value: number, locale: Locale) {
  return `${formatLocaleNumber(value, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function MoneyLines({
  totals,
  locale,
  fallbackCurrency,
}: {
  totals: CurrencyTotal[];
  locale: Locale;
  fallbackCurrency: string;
}) {
  if (totals.length === 0) {
    return <p>{formatCurrency(0, locale, fallbackCurrency)}</p>;
  }
  return (
    <div className="space-y-0.5">
      {totals.map((total) => (
        <p key={total.currency}>{formatCurrency(total.total, locale, total.currency)}</p>
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
}) {
  const content = (
    <Card className="hover:border-primary/40 h-full transition-colors">
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {hint ? <div className="text-muted-foreground mt-1 text-xs">{hint}</div> : null}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href as Route}>{content}</Link> : content;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [
    data,
    locale,
    workspace,
    t,
    tNav,
    tEnums,
    tSales,
    tSupport,
    tMarketing,
    tTimeline,
    tListings,
  ] = await Promise.all([
    getDashboardData(user.id),
    getLocale(),
    getWorkspaceDefaults(),
    getRawTranslator("dashboard"),
    getRawTranslator("nav"),
    getTranslations("enums"),
    getRawTranslator("sales"),
    getTranslations("support"),
    getTranslations("marketing"),
    getTranslations("timeline"),
    getRawTranslator("listings"),
  ]);

  const activeSale =
    data.listings.activeByTransaction.find((item) => item.transaction === "sale")?.count ?? 0;
  const activeRent =
    data.listings.activeByTransaction.find((item) => item.transaction === "rent")?.count ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("welcome", { name: user.name })}
        actions={
          <>
            <Button asChild size="sm">
              <Link href="/deals/new">
                <Handshake className="size-4" /> {tSales("newDeal")}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/tickets/new">
                <LifeBuoy className="size-4" /> {tSupport("newTicket")}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/campaigns/new">
                <Megaphone className="size-4" /> {tMarketing("newCampaign")}
              </Link>
            </Button>
          </>
        }
      />

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          {t("sales")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={t("openCommission")}
            value={
              <MoneyLines
                totals={data.sales.openValueByCurrency}
                locale={locale}
                fallbackCurrency={workspace.defaultCurrency}
              />
            }
            hint={
              <div className="space-y-0.5">
                <p>{tSales("dealCount", { count: data.sales.openCount })}</p>
                <p>{tSales("weightedCommission")}</p>
                <MoneyLines
                  totals={data.sales.weightedValueByCurrency}
                  locale={locale}
                  fallbackCurrency={workspace.defaultCurrency}
                />
              </div>
            }
            href="/deals"
          />
          <MetricCard
            label={t("wonCommission")}
            value={
              <MoneyLines
                totals={data.sales.wonThisMonthByCurrency}
                locale={locale}
                fallbackCurrency={workspace.defaultCurrency}
              />
            }
            hint={t("dealsWon", { count: data.sales.wonThisMonthCount })}
            href="/deals?view=list&status=won"
          />
          <MetricCard
            label={t("winRate")}
            value={percent(data.sales.winRate, locale)}
            hint={t("winRateHint")}
          />
          <MetricCard
            label={t("closingSoon")}
            value={formatNumber(data.sales.closingSoonCount, locale)}
            hint={t("closingSoonHint")}
            href="/deals?view=list"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            {tNav("listings")}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/listings/dashboard">{tListings("overviewTitle")}</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/listings">{tNav("listings")}</Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={tListings("dashboard.activeListings")}
            value={formatNumber(data.listings.activeTotal, locale)}
            href="/listings?status=active"
          />
          <MetricCard
            label={tListings("dashboard.saleListings")}
            value={formatNumber(activeSale, locale)}
            href="/listings?transaction=sale&status=active"
          />
          <MetricCard
            label={tListings("dashboard.rentListings")}
            value={formatNumber(activeRent, locale)}
            href="/listings?transaction=rent&status=active"
          />
          <MetricCard
            label={tListings("dashboard.upcomingViewings")}
            value={formatNumber(data.listings.upcomingViewings, locale)}
            href="/listings/dashboard"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          {t("support")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={t("openTickets")}
            value={formatNumber(data.support.openCount, locale)}
            hint={t("unassignedCount", { count: data.support.unassignedCount })}
            href="/tickets"
          />
          <MetricCard
            label={t("overdueTickets")}
            value={formatNumber(data.support.overdueCount, locale)}
            hint={t("overdueTicketsHint")}
            href="/tickets?overdue=1"
          />
          <MetricCard
            label={t("avgFirstResponse")}
            value={formatDurationHours(data.support.averageFirstResponseHours, locale)}
            hint={t("resolvedLast30Days")}
          />
          <MetricCard
            label={t("avgResolution")}
            value={formatDurationHours(data.support.averageResolutionHours, locale)}
            hint={t("resolvedLast30Days")}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            {t("marketing")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              label={t("activeCampaigns")}
              value={formatNumber(data.marketing.activeCampaigns, locale)}
              hint={t("recipientsCount", { count: data.marketing.audience })}
              href="/campaigns"
            />
            <MetricCard
              label={tMarketing("responseRate")}
              value={percent(data.marketing.responseRate, locale)}
              hint={t("conversionsCount", { count: data.marketing.conversions })}
            />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            {tTimeline("myTasks")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              label={t("overdueTasks")}
              value={formatNumber(data.tasks.overdue, locale)}
              href="/tasks"
            />
            <MetricCard
              label={t("dueToday")}
              value={formatNumber(data.tasks.dueToday, locale)}
              href="/tasks"
            />
            <MetricCard
              label={t("upcoming")}
              value={formatNumber(data.tasks.upcoming, locale)}
              href="/tasks"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          {t("trends")}
        </h2>
        <DashboardCharts
          pipeline={data.charts.pipeline}
          tickets={data.charts.tickets}
          campaigns={data.charts.campaign}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>{t("recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title={t("noActivityTitle")}
                description={t("noActivityDescription")}
              />
            ) : (
              <ul className="space-y-3">
                {data.recentActivity.map((activity) => (
                  <li key={activity.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{activity.subject}</p>
                        <p className="text-muted-foreground text-xs">
                          {tEnums(`activityType.${activity.type}`)} · {activity.authorName} ·{" "}
                          <LocalTime value={activity.occurredAt} timeZone={workspace.timeZone} />
                        </p>
                      </div>
                      <Badge variant="outline">{tEnums(`activityType.${activity.type}`)}</Badge>
                    </div>
                    {activity.links.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {activity.links.map((link) => (
                          <Link
                            key={`${link.type}-${link.id}`}
                            href={link.href}
                            className="text-muted-foreground hover:bg-muted rounded border px-1.5 py-0.5 text-[11px]"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("quickLinks")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/companies"
              className="hover:bg-muted flex items-center justify-between rounded-md border p-3 text-sm"
            >
              {tNav("companies")} <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/contacts"
              className="hover:bg-muted flex items-center justify-between rounded-md border p-3 text-sm"
            >
              {tNav("contacts")} <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/tasks"
              className="hover:bg-muted flex items-center justify-between rounded-md border p-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <CheckSquare className="size-4" /> {tNav("tasks")}
              </span>
              <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/segments"
              className="hover:bg-muted flex items-center justify-between rounded-md border p-3 text-sm"
            >
              {tMarketing("segments")} <ArrowUpRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
