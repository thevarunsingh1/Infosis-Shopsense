import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, Layers, PackageX, TrendingUp, Wallet } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusPill } from "@/components/status-pill";
import { EmptyState, TablePagination, TableSkeleton, TableToolbar } from "@/components/table-parts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTableState } from "@/hooks/use-table-state";
import {
  analyticsKeys,
  fetchInventoryOverview,
  fetchInventoryRows,
  type InventoryRow,
} from "@/lib/analytics";
import { compactNumber, currency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory Intelligence — ShopSense" },
      {
        name: "description",
        content:
          "Live stock levels, sales velocity, low-stock alerts and inventory value across your ShopSense catalogue.",
      },
      { property: "og:title", content: "Inventory Intelligence — ShopSense" },
      {
        property: "og:description",
        content: "Live stock levels, sales velocity and low-stock alerts across your catalogue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryPage,
});

const STATUSES = ["all", "in stock", "low stock", "critical", "out of stock"] as const;

function InventoryPage() {
  const overview = useQuery({
    queryKey: analyticsKeys.inventoryOverview,
    queryFn: fetchInventoryOverview,
  });
  const rowsQuery = useQuery({ queryKey: analyticsKeys.inventoryRows, queryFn: fetchInventoryRows });

  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<string>("all");

  const all = rowsQuery.data ?? [];
  const categories = useMemo(
    () => ["all", ...Array.from(new Set(all.map((row) => row.category))).sort()],
    [all],
  );

  const filtered = all.filter(
    (row) =>
      (category === "all" || row.category === category) &&
      (status === "all" || row.status === status),
  );

  const table = useTableState<InventoryRow>(
    filtered,
    (row) => `${row.name} ${row.category} ${row.vendor_name} ${row.status}`,
    10,
  );

  const lowStock = all.filter((row) => row.status !== "in stock");

  return (
    <>
      <PageHeader
        title="Inventory Intelligence"
        description="Stock health, sales velocity and replenishment signals calculated live from your catalogue and orders."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          index={0}
          label="Total products"
          value={compactNumber.format(overview.data?.total_products ?? 0)}
          hint="tracked SKUs"
          icon={Layers}
          loading={overview.isLoading}
        />
        <StatCard
          index={1}
          label="Inventory units"
          value={compactNumber.format(overview.data?.total_units ?? 0)}
          hint="units on hand"
          icon={Boxes}
          loading={overview.isLoading}
        />
        <StatCard
          index={2}
          label="Inventory value"
          value={currency.format(overview.data?.inventory_value ?? 0)}
          hint="stock × price"
          icon={Wallet}
          loading={overview.isLoading}
        />
        <StatCard
          index={3}
          label="Low in stock"
          value={compactNumber.format(overview.data?.low_stock ?? 0)}
          hint="at or below threshold"
          icon={AlertTriangle}
          loading={overview.isLoading}
        />
        <StatCard
          index={4}
          label="Out of stock"
          value={compactNumber.format(overview.data?.out_of_stock ?? 0)}
          hint="needs restocking now"
          icon={PackageX}
          loading={overview.isLoading}
        />
        <StatCard
          index={5}
          label="Fast movers"
          value={compactNumber.format(overview.data?.fast_movers ?? 0)}
          hint="15+ units in 30 days"
          icon={TrendingUp}
          loading={overview.isLoading}
        />
      </div>

      <div className="surface-card mt-5">
        <div className="flex items-center gap-2 border-b border-border p-5">
          <AlertTriangle className="size-4 text-warning" />
          <div>
            <h2 className="font-display text-base font-semibold">Low stock alerts</h2>
            <p className="text-xs text-muted-foreground">
              Products at or below their configured threshold
            </p>
          </div>
        </div>
        {rowsQuery.isLoading ? (
          <TableSkeleton rows={3} cols={2} />
        ) : rowsQuery.isError ? (
          <EmptyState
            title="Could not load inventory"
            description={(rowsQuery.error as Error).message}
          />
        ) : lowStock.length === 0 ? (
          <EmptyState
            title="Everything is well stocked"
            description="No product has dropped to its low-stock threshold."
          />
        ) : (
          <ul className="divide-y divide-border">
            {lowStock.slice(0, 8).map((row) => (
              <li key={row.product_id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium capitalize">{row.status}:</span> {row.name} —{" "}
                  {row.stock === 0
                    ? "out of stock"
                    : `only ${row.stock} unit${row.stock === 1 ? "" : "s"} remaining`}
                </span>
                <StatusPill status={row.status === "in stock" ? "active" : row.status} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="surface-card mt-5">
        <TableToolbar
          search={table.search}
          onSearch={table.setSearch}
          placeholder="Search products, categories or vendors…"
        >
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
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Stock status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((item) => (
                <SelectItem key={item} value={item} className="capitalize">
                  {item === "all" ? "All statuses" : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableToolbar>

        {rowsQuery.isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : table.rows.length === 0 ? (
          <EmptyState
            title="No products match"
            description="Adjust the search or filters to see inventory rows."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left font-medium">Product</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Units sold</th>
                  <th className="px-4 py-3 text-right font-medium">Velocity /day</th>
                  <th className="px-5 py-3 text-right font-medium">Last updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {table.rows.map((row) => (
                  <tr key={row.product_id} className="hover:bg-muted/40">
                    <td className="px-5 py-3.5">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.vendor_name}</p>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{row.category}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      {row.stock}
                      <span className="ml-1 text-xs text-muted-foreground">
                        /{row.low_stock_threshold}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusPill status={row.status === "in stock" ? "active" : row.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{row.units_sold}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{row.velocity}</td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground">
                      {formatDate(row.last_updated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TablePagination
          page={table.page}
          pageCount={table.pageCount}
          total={table.total}
          onPage={table.setPage}
        />
      </div>
    </>
  );
}
