import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchRevenueByMonth, fetchRevenueByVendor, qk } from "@/lib/data";
import { compactNumber, currency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — ShopSense" },
      { name: "description", content: "Revenue trends and vendor performance analytics for ShopSense." },
      { property: "og:title", content: "Analytics — ShopSense" },
      {
        property: "og:description",
        content: "Revenue trends and vendor performance analytics for ShopSense.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-card)",
  fontSize: 12,
} as const;

function AnalyticsPage() {
  const byMonth = useQuery({ queryKey: qk.revenueMonth, queryFn: fetchRevenueByMonth });
  const byVendor = useQuery({ queryKey: qk.revenueVendor, queryFn: fetchRevenueByVendor });

  const monthly = (byMonth.data ?? []).map((row) => ({
    ...row,
    label: new Date(row.month).toLocaleDateString("en-US", { month: "short" }),
  }));

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Where revenue comes from, how it trends, and which vendors move the needle."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="font-display text-base font-semibold">Monthly revenue</h2>
          <p className="mb-4 text-xs text-muted-foreground">Completed orders per month</p>
          {byMonth.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly} margin={{ left: -18, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => compactNumber.format(value)}
                  />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => currency.format(value)} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="surface-card p-5">
          <h2 className="font-display text-base font-semibold">Orders by vendor</h2>
          <p className="mb-4 text-xs text-muted-foreground">Completed order volume</p>
          {byVendor.isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byVendor.data ?? []} margin={{ left: -18, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="vendor_name"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(value: string) => value.split(" ")[0] ?? value}
                  />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={tooltipStyle} />
                  <Bar dataKey="orders" radius={[8, 8, 0, 0]} fill="var(--color-chart-2)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
