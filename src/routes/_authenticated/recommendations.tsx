import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Loader2, Search, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/table-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { analyticsKeys, fetchInventoryRows, fetchTopProducts } from "@/lib/analytics";
import { currency } from "@/lib/format";
import { indexProductEmbeddings, semanticProductSearch } from "@/lib/vector.functions";

export const Route = createFileRoute("/_authenticated/recommendations")({
  head: () => ({
    meta: [
      { title: "Recommendations — ShopSense" },
      {
        name: "description",
        content:
          "Rule-based product recommendations and semantic search built on real sales history in ShopSense.",
      },
      { property: "og:title", content: "Recommendations — ShopSense" },
      {
        property: "og:description",
        content: "Category best sellers and semantic product search powered by your sales data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecommendationsPage,
});

interface SearchResult {
  product_id: string;
  name: string;
  category: string;
  price: number;
  similarity: number;
}

function RecommendationsPage() {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [notIndexed, setNotIndexed] = useState(false);

  const inventory = useQuery({ queryKey: analyticsKeys.inventoryRows, queryFn: fetchInventoryRows });
  const categoryTop = useQuery({
    queryKey: analyticsKeys.topProducts(5, category),
    queryFn: () => fetchTopProducts(5, category),
  });
  const overall = useQuery({
    queryKey: analyticsKeys.topProducts(6, "all"),
    queryFn: () => fetchTopProducts(6, "all"),
  });

  const categories = useMemo(
    () => ["all", ...Array.from(new Set((inventory.data ?? []).map((r) => r.category))).sort()],
    [inventory.data],
  );

  const search = useServerFn(semanticProductSearch);
  const indexAll = useServerFn(indexProductEmbeddings);

  const searchMutation = useMutation({
    mutationFn: (value: string) => search({ data: { query: value, limit: 6 } }),
    onSuccess: (data) => {
      setNotIndexed(!data.indexed);
      setResults(data.results);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const indexMutation = useMutation({
    mutationFn: () => indexAll({}),
    onSuccess: (data) => {
      setNotIndexed(false);
      toast.success(`Indexed ${data.indexed} products for semantic search`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const recommended = (overall.data ?? []).filter((row) => row.orders > 0);

  return (
    <>
      <PageHeader
        title="Recommendations"
        description="What to promote next, derived from actual purchase history and semantic product similarity."
      />

      <div className="surface-card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold">
              {category === "all" ? "Top selling products" : `Top selling products in ${category}`}
            </h2>
            <p className="text-xs text-muted-foreground">
              Ranked by revenue and order frequency in this category
            </p>
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-[180px]">
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
        </div>

        {categoryTop.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (categoryTop.data ?? []).filter((r) => r.orders > 0).length === 0 ? (
          <EmptyState
            title="No sales in this category yet"
            description="Recommendations require completed orders to rank products."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(categoryTop.data ?? [])
              .filter((r) => r.orders > 0)
              .map((row, index) => (
                <div key={row.product_id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Star className="size-3.5 text-primary" /> #{index + 1} in {row.category}
                  </div>
                  <p className="mt-2 font-medium">{row.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.units_sold} units · {row.orders} orders
                  </p>
                  <p className="mt-2 font-display text-lg font-semibold">
                    {currency.format(row.revenue)}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="surface-card mt-5 p-5">
        <h2 className="font-display text-base font-semibold">Recommended products</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Frequently purchased across all categories over your full order history
        </p>
        {overall.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : recommended.length === 0 ? (
          <EmptyState
            title="Not enough history"
            description="Recommendations appear once products start selling."
          />
        ) : (
          <ul className="divide-y divide-border">
            {recommended.map((row) => (
              <li key={row.product_id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.category} · purchased {row.orders} times
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {currency.format(row.revenue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="surface-card mt-5 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold">Semantic product search</h2>
            <p className="text-xs text-muted-foreground">
              Vector search over product embeddings — try “products similar to wireless headphones”
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => indexMutation.mutate()}
            disabled={indexMutation.isPending}
          >
            {indexMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Rebuild index
          </Button>
        </div>

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim().length < 2) return;
            searchMutation.mutate(query.trim());
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Describe what a customer is looking for…"
              className="h-9 rounded-lg pl-9"
            />
          </div>
          <Button type="submit" size="sm" disabled={searchMutation.isPending}>
            {searchMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Search
          </Button>
        </form>

        <div className="mt-4">
          {searchMutation.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : notIndexed ? (
            <EmptyState
              title="Search index is empty"
              description="Run “Rebuild index” once to generate product embeddings, then search again."
            />
          ) : results === null ? (
            <p className="text-sm text-muted-foreground">
              Results appear here, ranked by semantic similarity.
            </p>
          ) : results.length === 0 ? (
            <EmptyState title="No matches" description="Try a broader description." />
          ) : (
            <ul className="divide-y divide-border">
              {results.map((row) => (
                <li key={row.product_id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.category} · {currency.format(row.price)}
                    </p>
                  </div>
                  <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                    {(row.similarity * 100).toFixed(0)}% match
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
