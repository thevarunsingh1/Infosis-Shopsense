import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Repeat, ShoppingBag, UserPlus, Users, Wallet } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/table-parts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  analyticsKeys,
  fetchCustomerOverview,
  fetchCustomerSegments,
} from "@/lib/analytics";
import { compactNumber, currency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/customer-analytics")({
  head: () => ({
    meta: [
      { title: "Customer Analytics — ShopSense" },
      {
        name: "description",
        content:
          "Customer value segments, repeat purchase behaviour and average order value calculated from real order data.",
      },
      { property: "og:title", content: "Customer Analytics — ShopSense" },
      {
        property: "og:description",
        content: "Segment customers by spend and understand repeat purchase behaviour.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerAnalyticsPage,
});

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-card)",
  fontSize: 12,
} as const;

function CustomerAnalyticsPage() {
  const overview = useQuery({
    queryKey: analyticsKeys.customerOverview,
    queryFn: fetchCustomerOverview,
  });
  const segments = useQuery({
    queryKey: analyticsKeys.customerSegments,
    queryFn: fetchCustomerSegments,
  });

  const rows = segments.data ?? [];

  return (
    <>
      <PageHeader
        title="Customer Analytics"
        description="Who buys, how often and how much — segmented directly from completed orders."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          index={0}
          label="Total customers"
          value={compactNumber.format(overview.data?.total_customers ?? 0)}
          hint="in your book"
          icon={Users}
          loading={overview.isLoading}
        />
        <StatCard
          index={1}
          label="New customers"
          value={compactNumber.format(overview.data?.new_customers ?? 0)}
          hint="added in 30 days"
          icon={UserPlus}
          loading={overview.isLoading}
        />
        <StatCard
          index={2}
          label="Returning customers"
          value={compactNumber.format(overview.data?.returning_customers ?? 0)}
          hint="more than one order"
          icon={Repeat}
          loading={overview.isLoading}
        />
        <StatCard
          index={3}
          label="Total revenue"
          value={currency.format(overview.data?.total_revenue ?? 0)}
          hint="completed orders"
          icon={Wallet}
          loading={overview.isLoading}
        />
        <StatCard
          index={4}
          label="Average order value"
          value={currency.format(overview.data?.avg_order_value ?? 0)}
          hint="per completed order"
          icon={ShoppingBag}
          loading={overview.isLoading}
        />
        <StatCard
          index={5}
          label="Average customer spend"
          value={currency.format(overview.data?.avg_customer_spend ?? 0)}
          hint="lifetime, purchasing customers"
          icon={Wallet}
          loading={overview.isLoading}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="surface-card p-5">
          <h2 className="font-display text-base font-semibold">Revenue by segment</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Segments derived from each customer&apos;s completed order total
          </p>
          {segments.isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : segments.isError ? (
            <EmptyState
              title="Could not load segments"
              description={(segments.error as Error).message}
            />
          ) : rows.length === 0 ? (
            <EmptyState title="No customers yet" description="Segments appear once orders exist." />
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ left: -18, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="segment" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(value: number) => compactNumber.format(value)}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)" }}
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => currency.format(value)}
                  />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill="var(--color-chart-2)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="surface-card p-5">
          <h2 className="font-display text-base font-semibold">Customer mix</h2>
          <p className="mb-4 text-xs text-muted-foreground">Share of customers per segment</p>
          {segments.isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : rows.length === 0 ? (
            <EmptyState title="Nothing to chart" description="Add customers and orders first." />
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rows}
                    dataKey="customers"
                    nameKey="segment"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={3}
                    stroke="var(--color-card)"
                    strokeWidth={2}
                  >
                    {rows.map((entry, index) => (
                      <Cell key={entry.segment} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="surface-card mt-5">
        <div className="border-b border-border p-5">
          <h2 className="font-display text-base font-semibold">Segment breakdown</h2>
          <p className="text-xs text-muted-foreground">
            High Value ≥ $20k · Regular ≥ $8k · Occasional ≥ $1k · Low Value below that
          </p>
        </div>
        {segments.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No segments" description="Segments require completed orders." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left font-medium">Segment</th>
                  <th className="px-4 py-3 text-right font-medium">Customers</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue</th>
                  <th className="px-4 py-3 text-right font-medium">Avg spend</th>
                  <th className="px-5 py-3 text-right font-medium">% of customers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.segment} className="hover:bg-muted/40">
                    <td className="px-5 py-3.5 font-medium">{row.segment}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{row.customers}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      {currency.format(row.revenue)}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      {currency.format(row.avg_spend)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{row.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
