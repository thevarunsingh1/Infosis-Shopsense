import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
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
import { analyticsKeys, fetchInventoryRows } from "@/lib/analytics";
import { forecastProductDemand } from "@/lib/forecast.functions";

export const Route = createFileRoute("/_authenticated/forecast")({
  head: () => ({
    meta: [
      { title: "Inventory Forecast — ShopSense" },
      {
        name: "description",
        content:
          "Predict next-week demand and recommended restock quantities from 90 days of sales history.",
      },
      { property: "og:title", content: "Inventory Forecast — ShopSense" },
      {
        property: "og:description",
        content: "Trend-based demand forecasting with restock recommendations for every product.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForecastPage,
});

const HORIZONS = [7, 14, 30] as const;

function ForecastPage() {
  const [productId, setProductId] = useState<string>("");
  const [horizon, setHorizon] = useState<number>(7);

  const inventory = useQuery({ queryKey: analyticsKeys.inventoryRows, queryFn: fetchInventoryRows });
  const products = inventory.data ?? [];

  useEffect(() => {
    if (!productId && products.length > 0) setProductId(products[0]!.product_id);
  }, [products, productId]);

  const run = useServerFn(forecastProductDemand);
  const forecast = useMutation({
    mutationFn: () => run({ data: { productId, horizonDays: horizon } }),
    onError: (error: Error) => toast.error(error.message),
  });

  const result = forecast.data;

  return (
    <>
      <PageHeader
        title="Inventory Forecast"
        description="A damped trend model over 90 days of sales history estimates upcoming demand and restock needs."
      />

      <div className="surface-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Product</label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((item) => (
                  <SelectItem key={item.product_id} value={item.product_id}>
                    {item.name} — {item.stock} in stock
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Horizon</label>
            <div className="flex gap-2">
              {HORIZONS.map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={horizon === value ? "default" : "outline"}
                  onClick={() => setHorizon(value)}
                >
                  {value}d
                </Button>
              ))}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => forecast.mutate()}
            disabled={!productId || forecast.isPending}
          >
            {forecast.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <TrendingUp className="size-4" />
            )}
            Forecast demand
          </Button>
        </div>
      </div>

      <div className="mt-5">
        {forecast.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : !result ? (
          <EmptyState
            title="No forecast yet"
            description="Pick a product and run the forecast to see predicted demand and restock advice."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <div className="surface-card p-5">
              <h2 className="font-display text-base font-semibold">{result.product.name}</h2>
              <p className="text-xs text-muted-foreground">
                {result.product.category} · {result.product.stock} units on hand
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Predicted demand ({horizon}d)</dt>
                  <dd className="font-semibold tabular-nums">{result.predictedDemand} units</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Average daily sales</dt>
                  <dd className="font-semibold tabular-nums">{result.averageDaily}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Trend</dt>
                  <dd className="font-semibold capitalize">{result.trend}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Days of cover left</dt>
                  <dd className="font-semibold tabular-nums">
                    {result.daysOfCover === null ? "—" : `${result.daysOfCover} days`}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Confidence</dt>
                  <dd className="font-semibold capitalize">{result.confidence}</dd>
                </div>
              </dl>
            </div>

            <div className="surface-card p-5">
              <h2 className="font-display text-base font-semibold">Restock recommendation</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Covers forecast demand plus a safety buffer
              </p>
              <p className="font-display text-4xl font-semibold">
                {result.recommendedRestock}
                <span className="ml-2 text-base font-normal text-muted-foreground">units</span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{result.rationale}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
