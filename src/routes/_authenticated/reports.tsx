import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { EmptyState, TablePagination, TableSkeleton, TableToolbar } from "@/components/table-parts";
import { useTableState } from "@/hooks/use-table-state";
import { listTransactions, qk, type Transaction } from "@/lib/data";
import { currency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — ShopSense" },
      { name: "description", content: "Transaction-level reporting across vendors, customers and products." },
      { property: "og:title", content: "Reports — ShopSense" },
      {
        property: "og:description",
        content: "Transaction-level reporting across vendors, customers and products.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data, isLoading } = useQuery({ queryKey: qk.transactions, queryFn: listTransactions });
  const table = useTableState<Transaction>(
    data ?? [],
    (row) => `${row.reference ?? ""} ${row.vendors?.name ?? ""} ${row.customers?.name ?? ""} ${row.status}`,
    10,
  );

  return (
    <>
      <PageHeader
        title="Reports"
        description="A transaction ledger you can search, page through and reconcile."
      />
      <div className="surface-card overflow-hidden">
        <TableToolbar
          search={table.search}
          onSearch={table.setSearch}
          placeholder="Search by reference, vendor, customer or status…"
        />
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : table.rows.length === 0 ? (
          <EmptyState title="No transactions" description="Nothing matches this search yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {table.rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{row.reference ?? row.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.vendors?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.customers?.name ?? "Guest"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(row.occurred_at)}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {currency.format(row.total_amount)}
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
