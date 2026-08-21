import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, ShoppingCart, TriangleAlert, Wallet, Boxes } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/table-parts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  analyticsKeys,
  fetchInventoryRows,
  fetchSalesTrends,
  fetchTopProducts,
  fetchValidation,
} from "@/lib/analytics";
import { compactNumber, currency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sales-analytics")({
  head: () => ({
    meta: [
      { title: "Sales Analytics — ShopSense" },
      {
        name: "description",
        content:
          "Revenue, orders and units sold over 7, 30 or 90 days plus your best selling products by category.",
      },
      { property: "og:title", content: "Sales Analytics — ShopSense" },
      {
        property: "og:description",
        content: "Track revenue, orders and units sold with top-selling product breakdowns.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalesAnalyticsPage,
});

const RANGES = [7, 30, 90] as const;

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-card)",
  fontSize: 12,
} as const;

function SalesAnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const [topLimit, setTopLimit] = useState(5);
  const [category, setCategory] = useState("all");

  const trends = useQuery({
    queryKey: analyticsKeys.salesTrends(days),
    queryFn: () => fetchSalesTrends(days),
  });
  const top = useQuery({
    queryKey: analyticsKeys.topProducts(topLimit, category),
    queryFn: () => fetchTopProducts(topLimit, category),
  });
  const inventory = useQuery({
    queryKey: analyticsKeys.inventoryRows,
    queryFn: fetchInventoryRows,
  });
  const validation = useQuery({
    queryKey: analyticsKeys.validation,
    queryFn: fetchValidation,
  });

  const categories = useMemo(
    () => ["all", ...Array.from(new Set((inventory.data ?? []).map((r) => r.category))).sort()],
    [inventory.data],
  );

  const series = (trends.data ?? []).map((row) => ({
    ...row,
    revenue: Number(row.revenue),
    units: Number(row.units),
    orders: Number(row.orders),
    label: new Date(row.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  const totals = series.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue,
      orders: acc.orders + row.orders,
      units: acc.units + row.units,
    }),
    { revenue: 0, orders: 0, units: 0 },
  );

  const v = validation.data;
  const checks = v
    ? [
        {
          label: "Revenue matches order line items",
          ok: Math.abs(v.revenue_from_orders - v.revenue_from_line_items) < 1,
          detail: `${currency.format(v.revenue_from_orders)} vs ${currency.format(v.revenue_from_line_items)}`,
        },
        {
          label: "Units sold match stock movements",
          ok: v.units_from_orders === v.units_from_movements,
          detail: `${v.units_from_orders} sold · ${v.units_from_movements} logged`,
        },
        {
          label: "Customer spend reconciles to orders",
          ok: v.customer_spend_total <= v.revenue_from_orders + 1,
          detail: `${currency.format(v.customer_spend_total)} attributed`,
        },
        {
          label: "Forecasting has sales history",
          ok: v.history_days >= 30,
          detail: `${v.history_days} days of orders`,
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Sales Analytics"
        description="Revenue, orders and units over time with the products driving them."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {RANGES.map((range) => (
          <Button
            key={range}
            size="sm"
            variant={days === range ? "default" : "outline"}
            onClick={() => setDays(range)}
          >
            {range} days
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          index={0}
          label="Revenue"
          value={currency.format(totals.revenue)}
          hint={`last ${days} days`}
          icon={Wallet}
          loading={trends.isLoading}
        />
        <StatCard
          index={1}
          label="Orders"
          value={compactNumber.format(totals.orders)}
          hint={`last ${days} days`}
          icon={ShoppingCart}
          loading={trends.isLoading}
        />
        <StatCard
          index={2}
          label="Units sold"
          value={compactNumber.format(totals.units)}
          hint={`last ${days} days`}
          icon={Boxes}
          loading={trends.isLoading}
        />
      </div>

      <div className="surface-card mt-5 p-5">
        <h2 className="font-display text-base font-semibold">Sales trend</h2>
        <p className="mb-4 text-xs text-muted-foreground">Completed revenue and units per day</p>
        {trends.isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : trends.isError ? (
          <EmptyState title="Could not load trends" description={(trends.error as Error).message} />
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={24} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={(value: number) => compactNumber.format(value)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) =>
                    name === "revenue" ? currency.format(value) : value
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2.5}
                  fill="url(#sales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="surface-card mt-5">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold">Top selling products</h2>
            <p className="text-xs text-muted-foreground">Ranked by revenue from completed orders</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-[168px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === "all" ? "All categories" : item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant={topLimit === 5 ? "default" : "outline"}
              onClick={() => setTopLimit(5)}
            >
              Top 5
            </Button>
            <Button
              size="sm"
              variant={topLimit === 10 ? "default" : "outline"}
              onClick={() => setTopLimit(10)}
            >
              Top 10
            </Button>
          </div>
        </div>

        {top.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : (top.data ?? []).length === 0 ? (
          <EmptyState title="No sales yet" description="Top products appear once orders land." />
        ) : (
          <>
            <div className="h-[260px] p-5">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top.data ?? []} margin={{ left: -18, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    interval={0}
                    tickFormatter={(value: string) => value.split(" ")[0] ?? value}
                  />
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
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill="var(--color-chart-3)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 text-left font-medium">Product</th>
                    <th className="px-4 py-3 text-left font-medium">Category</th>
                    <th className="px-4 py-3 text-right font-medium">Units sold</th>
                    <th className="px-4 py-3 text-right font-medium">Orders</th>
                    <th className="px-5 py-3 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(top.data ?? []).map((row) => (
                    <tr key={row.product_id} className="hover:bg-muted/40">
                      <td className="px-5 py-3.5 font-medium">{row.name}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{row.category}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">{row.units_sold}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">{row.orders}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        {currency.format(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="surface-card mt-5 p-5">
        <h2 className="font-display text-base font-semibold">Data integrity</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Every figure on this page is recomputed from stored orders and stock movements
        </p>
        {validation.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {checks.map((check) => (
              <div
                key={check.label}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                {check.ok ? (
                  <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                ) : (
                  <TriangleAlert className="mt-0.5 size-4 text-warning" />
                )}
                <div>
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className="text-xs text-muted-foreground">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
