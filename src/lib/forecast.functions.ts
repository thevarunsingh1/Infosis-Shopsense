import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ForecastInput = z.object({
  productId: z.string().uuid(),
  horizonDays: z.number().int().min(7).max(60).default(7),
});

export const forecastProductDemand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ForecastInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, stock, low_stock_threshold, category")
      .eq("id", data.productId)
      .maybeSingle();
    if (productError) throw new Error(productError.message);
    if (!product) throw new Error("Product not found or not accessible.");

    const { data: history, error: historyError } = await supabase.rpc("product_sales_history", {
      _product_id: data.productId,
      _days: 90,
    });
    if (historyError) throw new Error(historyError.message);

    const rows = (history ?? []).map((row) => ({
      day: String(row.day),
      units: Number(row.units ?? 0),
    }));

    const { forecastDemand } = await import("./forecast.server");
    const result = forecastDemand(rows, data.horizonDays, product.stock ?? 0);

    return {
      product: {
        id: product.id,
        name: product.name,
        stock: product.stock,
        category: product.category,
        low_stock_threshold: product.low_stock_threshold,
      },
      ...result,
    };
  });
