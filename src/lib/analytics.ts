import { supabase } from "@/integrations/supabase/client";

/* ---------------- Types ---------------- */

export interface InventoryOverview {
  total_products: number;
  total_units: number;
  low_stock: number;
  out_of_stock: number;
  inventory_value: number;
  fast_movers: number;
}

export type StockStatus = "in stock" | "low stock" | "critical" | "out of stock";

export interface InventoryRow {
  product_id: string;
  name: string;
  category: string;
  vendor_name: string;
  stock: number;
  low_stock_threshold: number;
  price: number;
  status: StockStatus;
  units_sold: number;
  units_30d: number;
  velocity: number;
  last_updated: string;
}

export interface CustomerOverview {
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  total_revenue: number;
  avg_order_value: number;
  avg_customer_spend: number;
}

export interface CustomerSegment {
  segment: string;
  customers: number;
  revenue: number;
  avg_spend: number;
  pct: number;
}

export interface SalesTrendPoint {
  day: string;
  revenue: number;
  orders: number;
  units: number;
}

export interface TopProduct {
  product_id: string;
  name: string;
  category: string;
  image_url: string | null;
  units_sold: number;
  revenue: number;
  orders: number;
}

export interface AnalyticsValidation {
  revenue_from_orders: number;
  revenue_from_line_items: number;
  units_from_orders: number;
  units_from_movements: number;
  customer_spend_total: number;
  orders_counted: number;
  products_tracked: number;
  history_days: number;
}

export interface ProductReview {
  id: string;
  product_id: string;
  author_name: string | null;
  rating: number;
  title: string | null;
  body: string;
  sentiment_label: string | null;
  sentiment_score: number | null;
  created_at: string;
  products?: { name: string } | null;
}

/* ---------------- Fetchers ---------------- */

function unwrapRpc<T>(result: { data: unknown; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export async function fetchInventoryOverview(): Promise<InventoryOverview> {
  return unwrapRpc<InventoryOverview>(await supabase.rpc("inventory_overview"));
}

export async function fetchInventoryRows(): Promise<InventoryRow[]> {
  return (unwrapRpc<InventoryRow[]>(await supabase.rpc("inventory_rows")) ?? []) as InventoryRow[];
}

export async function fetchCustomerOverview(): Promise<CustomerOverview> {
  return unwrapRpc<CustomerOverview>(await supabase.rpc("customer_overview"));
}

export async function fetchCustomerSegments(): Promise<CustomerSegment[]> {
  return (unwrapRpc<CustomerSegment[]>(await supabase.rpc("customer_segments")) ?? []) as CustomerSegment[];
}

export async function fetchSalesTrends(days: number): Promise<SalesTrendPoint[]> {
  return (unwrapRpc<SalesTrendPoint[]>(await supabase.rpc("sales_trends", { _days: days })) ??
    []) as SalesTrendPoint[];
}

export async function fetchTopProducts(limit: number, category?: string): Promise<TopProduct[]> {
  return (unwrapRpc<TopProduct[]>(
    await supabase.rpc("top_products", {
      _limit: limit,
      _category: category && category !== "all" ? category : null,
    }),
  ) ?? []) as TopProduct[];
}

export async function fetchValidation(): Promise<AnalyticsValidation> {
  return unwrapRpc<AnalyticsValidation>(await supabase.rpc("analytics_validation"));
}

export async function fetchReviews(productId?: string): Promise<ProductReview[]> {
  let query = supabase
    .from("product_reviews")
    .select("*, products(name)")
    .order("created_at", { ascending: false });
  if (productId && productId !== "all") query = query.eq("product_id", productId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ProductReview[];
}

export async function adjustStock(productId: string, delta: number, reason: string) {
  const { data, error } = await supabase.rpc("adjust_stock", {
    _product_id: productId,
    _delta: delta,
    _reason: reason,
  });
  if (error) throw new Error(error.message);
  return data as number;
}

/* ---------------- Query keys ---------------- */

export const analyticsKeys = {
  inventoryOverview: ["inventory-overview"] as const,
  inventoryRows: ["inventory-rows"] as const,
  customerOverview: ["customer-overview"] as const,
  customerSegments: ["customer-segments"] as const,
  salesTrends: (days: number) => ["sales-trends", days] as const,
  topProducts: (limit: number, category: string) => ["top-products", limit, category] as const,
  validation: ["analytics-validation"] as const,
  reviews: (productId: string) => ["product-reviews", productId] as const,
};
