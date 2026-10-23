import Link from "next/link";
import type { Route } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowUpRight,
  CheckSquare,
  Handshake,
  LifeBuoy,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { requireUser } from "@/lib/auth/guards";
import { getDashboardData } from "@/lib/services/dashboard";
import { formatDurationHours } from "@/lib/dates";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { formatNumber as formatLocaleNumber } from "@/i18n/format";
import type { Locale } from "@/i18n/config";

function percent(value: number, locale: Locale) {
  return `${formatLocaleNumber(value, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function MetricCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const content = (
    <Card className="h-full transition-colors hover:border-primary/40">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href as Route}>{content}</Link> : content;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [data, locale, t, tNav, tEnums, tSales, tSupport, tMarketing, tTimeline] = await Promise.all([
    getDashboardData(user.id),
    getLocale(),
    getTranslations("dashboard"),
    getTranslations("nav"),
    getTranslations("enums"),
    getTranslations("sales"),
    getTranslations("support"),
    getTranslations("marketing"),
    getTranslations("timeline"),
  ]);

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
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{t("sales")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={t("openPipeline")}
            value={formatCurrency(data.sales.openValue, locale)}
            hint={t("openPipelineHint", {
              count: data.sales.openCount,
              weighted: formatCurrency(data.sales.weightedValue, locale),
            })}
            href="/deals"
          />
          <MetricCard
            label={t("wonThisMonth")}
            value={formatCurrency(data.sales.wonThisMonthValue, locale)}
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
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{t("support")}</h2>
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
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{t("marketing")}</h2>
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
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{tTimeline("myTasks")}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label={t("overdueTasks")} value={formatNumber(data.tasks.overdue, locale)} href="/tasks" />
            <MetricCard label={t("dueToday")} value={formatNumber(data.tasks.dueToday, locale)} href="/tasks" />
            <MetricCard label={t("upcoming")} value={formatNumber(data.tasks.upcoming, locale)} href="/tasks" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{t("trends")}</h2>
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
                        <p className="text-xs text-muted-foreground">
                          {tEnums(`activityType.${activity.type}`)} · {activity.authorName} ·{" "}
                          <LocalTime value={activity.occurredAt} />
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
                            className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
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
            <Link href="/companies" className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted">
              {tNav("companies")} <ArrowUpRight className="size-4" />
            </Link>
            <Link href="/contacts" className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted">
              {tNav("contacts")} <ArrowUpRight className="size-4" />
            </Link>
            <Link href="/tasks" className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted">
              <span className="flex items-center gap-2"><CheckSquare className="size-4" /> {tNav("tasks")}</span>
              <ArrowUpRight className="size-4" />
            </Link>
            <Link href="/segments" className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted">
              {tMarketing("segments")} <ArrowUpRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
