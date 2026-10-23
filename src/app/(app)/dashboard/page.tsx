import Link from "next/link";
import type { Route } from "next";
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
import { formatCurrency, titleCase } from "@/lib/utils";
import { getLocale } from "next-intl/server";

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
  const [data, locale] = await Promise.all([getDashboardData(user.id), getLocale()]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user.name}. Here is what needs attention across the workspace.`}
        actions={
          <>
            <Button asChild size="sm">
              <Link href="/deals/new">
                <Handshake className="size-4" /> New deal
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/tickets/new">
                <LifeBuoy className="size-4" /> New ticket
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/campaigns/new">
                <Megaphone className="size-4" /> New campaign
              </Link>
            </Button>
          </>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Sales</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Open pipeline"
            value={formatCurrency(data.sales.openValue, locale)}
            hint={`${data.sales.openCount} open deals · ${formatCurrency(data.sales.weightedValue, locale)} weighted`}
            href="/deals"
          />
          <MetricCard
            label="Won this month"
            value={formatCurrency(data.sales.wonThisMonthValue, locale)}
            hint={`${data.sales.wonThisMonthCount} deals won`}
            href="/deals?view=list&status=won"
          />
          <MetricCard
            label="Win rate this month"
            value={`${data.sales.winRate.toFixed(1)}%`}
            hint="Won / (won + lost) closed this month"
          />
          <MetricCard
            label="Closing in 30 days"
            value={String(data.sales.closingSoonCount)}
            hint="Open deals with an expected close date"
            href="/deals?view=list"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Support</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Open tickets"
            value={String(data.support.openCount)}
            hint={`${data.support.unassignedCount} unassigned`}
            href="/tickets"
          />
          <MetricCard
            label="Overdue tickets"
            value={String(data.support.overdueCount)}
            hint="Missed first-response or resolution target"
            href="/tickets?overdue=1"
          />
          <MetricCard
            label="Avg first response"
            value={formatDurationHours(data.support.averageFirstResponseHours, locale)}
            hint="Tickets resolved in the last 30 days"
          />
          <MetricCard
            label="Avg resolution"
            value={formatDurationHours(data.support.averageResolutionHours, locale)}
            hint="Tickets resolved in the last 30 days"
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Marketing</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              label="Active campaigns"
              value={String(data.marketing.activeCampaigns)}
              hint={`${data.marketing.audience} recipients`}
              href="/campaigns"
            />
            <MetricCard
              label="Response rate"
              value={`${data.marketing.responseRate.toFixed(1)}%`}
              hint={`${data.marketing.conversions} conversions`}
            />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">My tasks</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Overdue" value={String(data.tasks.overdue)} href="/tasks" />
            <MetricCard label="Due today" value={String(data.tasks.dueToday)} href="/tasks" />
            <MetricCard label="Upcoming" value={String(data.tasks.upcoming)} href="/tasks" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Trends</h2>
        <DashboardCharts
          pipeline={data.charts.pipeline}
          tickets={data.charts.tickets}
          campaigns={data.charts.campaign}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No activity yet"
                description="Log a note, call, email, or meeting from any record to start the timeline."
              />
            ) : (
              <ul className="space-y-3">
                {data.recentActivity.map((activity) => (
                  <li key={activity.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{activity.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {titleCase(activity.type)} · {activity.authorName} ·{" "}
                          <LocalTime value={activity.occurredAt} />
                        </p>
                      </div>
                      <Badge variant="outline">{titleCase(activity.type)}</Badge>
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
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/companies" className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted">
              Companies <ArrowUpRight className="size-4" />
            </Link>
            <Link href="/contacts" className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted">
              Contacts <ArrowUpRight className="size-4" />
            </Link>
            <Link href="/tasks" className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted">
              <span className="flex items-center gap-2"><CheckSquare className="size-4" /> Tasks</span>
              <ArrowUpRight className="size-4" />
            </Link>
            <Link href="/segments" className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted">
              Segments <ArrowUpRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
