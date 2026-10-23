"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { formatCurrencyUsd } from "@/i18n/format";

const COLORS = ["#4f6bed", "#2aa7a1", "#e0a43b", "#a855f7", "#ef4444", "#64748b"];

export function DashboardCharts({
  pipeline,
  tickets,
  campaigns,
}: {
  pipeline: Array<{ stage: string; value: number }>;
  tickets: Array<{ status: string; count: number }>;
  campaigns: Array<{ status: string; count: number }>;
}) {
  const t = useTranslations("dashboard");
  const tEnums = useTranslations("enums");
  const locale = useLocale();
  const ticketStatusLabels = {
    open: tEnums("ticketStatus.open"),
    in_progress: tEnums("ticketStatus.in_progress"),
    pending: tEnums("ticketStatus.pending"),
    resolved: tEnums("ticketStatus.resolved"),
    closed: tEnums("ticketStatus.closed"),
  };
  const recipientStatusLabels = {
    targeted: tEnums("recipientStatus.targeted"),
    sent: tEnums("recipientStatus.sent"),
    opened: tEnums("recipientStatus.opened"),
    clicked: tEnums("recipientStatus.clicked"),
    responded: tEnums("recipientStatus.responded"),
    converted: tEnums("recipientStatus.converted"),
  };

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>{t("openDealValueByStage")}</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {pipeline.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {t("noPipelineData")}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipeline} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="stage" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickFormatter={(value) =>
                    formatCurrencyUsd(Number(value), locale, {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    })
                  }
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value), locale)} />
                <Bar
                  dataKey="value"
                  name={t("seriesDealValue")}
                  fill="#4f6bed"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("ticketsByStatus")}</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {tickets.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {t("noTickets")}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tickets.map((item) => ({
                    ...item,
                    name: ticketStatusLabels[item.status as keyof typeof ticketStatusLabels],
                  }))}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {tickets.map((item, index) => (
                    <Cell key={item.status} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatNumber(Number(value), locale)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle>{t("activeCampaignEngagement")}</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {campaigns.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {t("noCampaignRecipients")}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={campaigns.map((item) => ({
                  ...item,
                  name: recipientStatusLabels[
                    item.status as keyof typeof recipientStatusLabels
                  ],
                }))}
                margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip formatter={(value) => formatNumber(Number(value), locale)} />
                <Bar
                  dataKey="count"
                  name={t("seriesRecipients")}
                  fill="#2aa7a1"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
