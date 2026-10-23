"use client";

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
import { formatCurrency, titleCase } from "@/lib/utils";

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
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Open deal value by stage</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {pipeline.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No pipeline data yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipeline} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="stage" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="value" fill="#4f6bed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tickets by status</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {tickets.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No tickets yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tickets.map((item) => ({ ...item, name: titleCase(item.status) }))}
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
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle>Active campaign engagement</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {campaigns.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No active campaign recipients yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={campaigns.map((item) => ({ ...item, name: titleCase(item.status) }))}
                margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#2aa7a1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
