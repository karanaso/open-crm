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
import { formatCurrency, formatNumber } from "@/i18n/format";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: "var(--popover)",
  borderColor: "var(--border)",
  borderRadius: "0.5rem",
  color: "var(--popover-foreground)",
} as const;

const TOOLTIP_ITEM_STYLE = { color: "var(--popover-foreground)" } as const;
const TOOLTIP_LABEL_STYLE = { color: "var(--popover-foreground)" } as const;
const LEGEND_STYLE = { color: "var(--muted-foreground)" } as const;
const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 } as const;

type PipelinePoint = {
  stage: string;
  currency: string;
  value: number;
};

export function DashboardCharts({
  pipeline,
  tickets,
  campaigns,
}: {
  pipeline: PipelinePoint[];
  tickets: Array<{ status: string; count: number }>;
  campaigns: Array<{ status: string; count: number }>;
}) {
  const t = useTranslations("dashboard");
  const tEnums = useTranslations("enums");
  const tSales = useTranslations("sales") as unknown as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;
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

  const pipelineStages = [...new Set(pipeline.map((item) => item.stage))];
  const pipelineCurrencies = [...new Set(pipeline.map((item) => item.currency))].sort();
  const pipelineValues = new Map(
    pipeline.map((item) => [`${item.stage}:${item.currency}`, item.value]),
  );
  const pipelineChartData = pipelineStages.map((stage) => {
    const row: Record<string, string | number> = { stage };
    for (const currency of pipelineCurrencies) {
      row[currency] = pipelineValues.get(`${stage}:${currency}`) ?? 0;
    }
    return row;
  });

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>{t("openDealValueByStage")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-64">
            {pipeline.length === 0 ? (
              <p className="text-muted-foreground flex h-full items-center justify-center text-sm">
                {t("noPipelineData")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pipelineChartData}
                  margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="stage"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tick={AXIS_TICK}
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      formatNumber(Number(value), locale, {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      })
                    }
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tick={AXIS_TICK}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(Number(value), locale, String(name)),
                      String(name),
                    ]}
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  {pipelineCurrencies.map((currency, index) => (
                    <Bar
                      key={currency}
                      dataKey={currency}
                      name={currency}
                      stackId="commission"
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {pipeline.length > 0 ? (
            <table className="sr-only">
              <caption>{t("openDealValueByStage")}</caption>
              <thead>
                <tr>
                  <th scope="col">{tSales("stage")}</th>
                  <th scope="col">{tSales("currency")}</th>
                  <th scope="col">{tSales("commission")}</th>
                </tr>
              </thead>
              <tbody>
                {pipelineStages.flatMap((stage) =>
                  pipelineCurrencies.map((currency) => (
                    <tr key={`${stage}:${currency}`}>
                      <td>{stage}</td>
                      <td>{currency}</td>
                      <td>
                        {formatCurrency(
                          pipelineValues.get(`${stage}:${currency}`) ?? 0,
                          locale,
                          currency,
                        )}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("ticketsByStatus")}</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {tickets.length === 0 ? (
            <p className="text-muted-foreground flex h-full items-center justify-center text-sm">
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
                <Tooltip
                  formatter={(value) => formatNumber(Number(value), locale)}
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                />
                <Legend wrapperStyle={LEGEND_STYLE} />
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
            <p className="text-muted-foreground flex h-full items-center justify-center text-sm">
              {t("noCampaignRecipients")}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={campaigns.map((item) => ({
                  ...item,
                  name: recipientStatusLabels[item.status as keyof typeof recipientStatusLabels],
                }))}
                margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={AXIS_TICK} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} />
                <Tooltip
                  formatter={(value) => formatNumber(Number(value), locale)}
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />
                <Bar
                  dataKey="count"
                  name={t("seriesRecipients")}
                  fill="var(--chart-2)"
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
