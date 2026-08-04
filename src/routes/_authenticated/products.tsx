import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { EmptyState, TablePagination, TableSkeleton, TableToolbar } from "@/components/table-parts";
import { useTableState } from "@/hooks/use-table-state";
import { listProducts, qk, type Product } from "@/lib/data";
import { currencyPrecise } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Products — ShopSense" },
      { name: "description", content: "Browse and search the full product catalogue across vendors." },
      { property: "og:title", content: "Products — ShopSense" },
      {
        property: "og:description",
        content: "Browse and search the full product catalogue across vendors.",
      },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { data, isLoading } = useQuery({ queryKey: qk.products, queryFn: listProducts });
  const table = useTableState<Product>(
    data ?? [],
    (row) => `${row.name} ${row.sku ?? ""} ${row.category} ${row.vendors?.name ?? ""}`,
  );

  return (
    <>
      <PageHeader
        title="Products"
        description="The full catalogue across every vendor, with pricing, stock and listing status."
      />
      <div className="surface-card overflow-hidden">
        <TableToolbar
          search={table.search}
          onSearch={table.setSearch}
          placeholder="Search products by name, SKU, category or vendor…"
        />
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : table.rows.length === 0 ? (
          <EmptyState title="No products found" description="Adjust your search to see more of the catalogue." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {table.rows.map((product) => (
                  <tr key={product.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sku ?? "No SKU"}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{product.vendors?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                    <td className="px-4 py-3 tabular-nums">{currencyPrecise.format(product.price)}</td>
                    <td className="px-4 py-3 tabular-nums">{product.stock}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={product.status} />
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
