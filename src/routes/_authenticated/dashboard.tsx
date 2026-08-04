import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
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
import { DollarSign, Package, ShoppingCart, Store } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusPill } from "@/components/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchDashboardStats,
  fetchRevenueByMonth,
  fetchRevenueByVendor,
  listTransactions,
  qk,
} from "@/lib/data";
import { compactNumber, currency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ShopSense" },
      {
        name: "description",
        content: "Track total sales, revenue by vendor, catalogue size and recent orders in ShopSense.",
      },
      { property: "og:title", content: "Dashboard — ShopSense" },
      {
        property: "og:description",
        content: "Track total sales, revenue by vendor, catalogue size and recent orders in ShopSense.",
      },
    ],
  }),
  component: DashboardPage,
});

const PIE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function ChartCard({
  title,
  subtitle,
  children,
  loading,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="surface-card p-5">
      <div className="mb-5">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {loading ? <Skeleton className="h-[260px] w-full" /> : <div className="h-[260px]">{children}</div>}
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-card)",
  fontSize: 12,
  boxShadow: "var(--shadow-lift)",
} as const;

function DashboardPage() {
  const stats = useQuery({ queryKey: qk.stats, queryFn: fetchDashboardStats });
  const byVendor = useQuery({ queryKey: qk.revenueVendor, queryFn: fetchRevenueByVendor });
  const byMonth = useQuery({ queryKey: qk.revenueMonth, queryFn: fetchRevenueByMonth });
  const transactions = useQuery({ queryKey: qk.transactions, queryFn: listTransactions });

  const recent = (transactions.data ?? []).slice(0, 6);
  const monthly = (byMonth.data ?? []).map((row) => ({
    ...row,
    label: new Date(row.month).toLocaleDateString("en-US", { month: "short" }),
  }));
  const topVendors = (byVendor.data ?? []).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A live read on sales, vendor performance and catalogue health across the platform."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          label="Total sales"
          value={currency.format(stats.data?.total_sales ?? 0)}
          delta={12.4}
          hint="vs last period"
          icon={DollarSign}
          loading={stats.isLoading}
        />
        <StatCard
          index={1}
          label="Orders"
          value={compactNumber.format(stats.data?.transaction_count ?? 0)}
          delta={6.1}
          hint="all statuses"
          icon={ShoppingCart}
          loading={stats.isLoading}
        />
        <StatCard
          index={2}
          label="Active vendors"
          value={compactNumber.format(stats.data?.vendor_count ?? 0)}
          hint={`${stats.data?.pending_vendors ?? 0} awaiting approval`}
          icon={Store}
          loading={stats.isLoading}
        />
        <StatCard
          index={3}
          label="Products"
          value={compactNumber.format(stats.data?.product_count ?? 0)}
          delta={3.8}
          hint="listed SKUs"
          icon={Package}
          loading={stats.isLoading}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Revenue trend"
          subtitle="Completed revenue by month"
          loading={byMonth.isLoading}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly} margin={{ left: -18, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickFormatter={(value: number) => compactNumber.format(value)}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => currency.format(value)}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-chart-1)"
                strokeWidth={2.5}
                fill="url(#rev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Revenue share"
          subtitle="Top vendors by contribution"
          loading={byVendor.isLoading}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={topVendors}
                dataKey="revenue"
                nameKey="vendor_name"
                innerRadius={58}
                outerRadius={92}
                paddingAngle={3}
                stroke="var(--color-card)"
                strokeWidth={2}
              >
                {topVendors.map((entry, index) => (
                  <Cell key={entry.vendor_id} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => currency.format(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <ChartCard
          title="Revenue by vendor"
          subtitle="Completed orders per vendor"
          loading={byVendor.isLoading}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topVendors} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="vendor_name"
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
              <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill="var(--color-chart-2)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="surface-card">
          <div className="border-b border-border p-5">
            <h2 className="font-display text-base font-semibold">Recent orders</h2>
            <p className="text-xs text-muted-foreground">Latest transactions across your vendors</p>
          </div>
          {transactions.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((row) => (
                <li key={row.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {row.products?.name ?? row.reference ?? "Order"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.vendors?.name} · {row.customers?.name ?? "Guest"} ·{" "}
                      {formatDate(row.occurred_at)}
                    </p>
                  </div>
                  <StatusPill status={row.status} />
                  <span className="w-24 text-right text-sm font-semibold tabular-nums">
                    {currency.format(row.total_amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
