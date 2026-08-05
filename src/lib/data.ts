import { supabase } from "@/integrations/supabase/client";

export type VendorStatus = "pending" | "approved" | "rejected" | "suspended";
export type ProductStatus = "draft" | "active" | "archived";
export type TransactionStatus = "pending" | "completed" | "refunded" | "cancelled";

export interface Vendor {
  id: string;
  owner_id: string | null;
  name: string;
  contact_email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  category: string;
  description: string | null;
  logo_url: string | null;
  status: VendorStatus;
  rating: number;
  created_at: string;
}

export interface Product {
  id: string;
  vendor_id: string;
  name: string;
  sku: string | null;
  description: string | null;
  seo_description: string | null;
  price: number;
  stock: number;
  category: string;
  image_url: string | null;
  tags: string[];
  keywords: string[];
  status: ProductStatus;
  created_at: string;
  vendors?: { name: string } | null;
}

export interface Customer {
  id: string;
  vendor_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
  vendors?: { name: string } | null;
}

export interface Transaction {
  id: string;
  vendor_id: string;
  customer_id: string | null;
  product_id: string | null;
  reference: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: TransactionStatus;
  occurred_at: string;
  created_at: string;
  vendors?: { name: string } | null;
  customers?: { name: string } | null;
  products?: { name: string } | null;
}

export interface DashboardStats {
  total_sales: number;
  transaction_count: number;
  product_count: number;
  vendor_count: number;
  customer_count: number;
  pending_vendors: number;
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as T;
}

/* ---------------- Vendors ---------------- */

export async function listVendors(): Promise<Vendor[]> {
  return unwrap(
    await supabase.from("vendors").select("*").order("created_at", { ascending: false }),
  ) as Vendor[];
}

export async function createVendor(payload: Partial<Vendor>) {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("vendors").insert({
    owner_id: userData.user?.id ?? null,
    name: payload.name!,
    contact_email: payload.contact_email!,
    phone: payload.phone ?? null,
    address: payload.address ?? null,
    city: payload.city ?? null,
    country: payload.country ?? null,
    category: payload.category ?? "General",
    description: payload.description ?? null,
    status: payload.status ?? "pending",
  });
  if (error) throw new Error(error.message);
}

export async function updateVendor(id: string, payload: Partial<Vendor>) {
  const { error } = await supabase.from("vendors").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteVendor(id: string) {
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Products ---------------- */

export async function listProducts(): Promise<Product[]> {
  return unwrap(
    await supabase
      .from("products")
      .select("*, vendors(name)")
      .order("created_at", { ascending: false }),
  ) as Product[];
}

export async function createProduct(payload: Partial<Product>) {
  const { error } = await supabase.from("products").insert({
    vendor_id: payload.vendor_id!,
    name: payload.name!,
    sku: payload.sku ?? null,
    description: payload.description ?? null,
    seo_description: payload.seo_description ?? null,
    price: payload.price ?? 0,
    stock: payload.stock ?? 0,
    category: payload.category ?? "General",
    image_url: payload.image_url ?? null,
    tags: payload.tags ?? [],
    keywords: payload.keywords ?? [],
    status: payload.status ?? "active",
  });
  if (error) throw new Error(error.message);
}

export async function updateProduct(id: string, payload: Partial<Product>) {
  const { vendors: _vendors, ...rest } = payload;
  const { error } = await supabase.from("products").update(rest).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Customers ---------------- */

export async function listCustomers(): Promise<Customer[]> {
  return unwrap(
    await supabase
      .from("customers")
      .select("*, vendors(name)")
      .order("created_at", { ascending: false }),
  ) as Customer[];
}

export async function createCustomer(payload: Partial<Customer>) {
  const { error } = await supabase.from("customers").insert({
    vendor_id: payload.vendor_id!,
    name: payload.name!,
    email: payload.email!,
    phone: payload.phone ?? null,
    company: payload.company ?? null,
    city: payload.city ?? null,
    country: payload.country ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function updateCustomer(id: string, payload: Partial<Customer>) {
  const { vendors: _vendors, ...rest } = payload;
  const { error } = await supabase.from("customers").update(rest).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCustomer(id: string) {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Transactions ---------------- */

export async function listTransactions(): Promise<Transaction[]> {
  return unwrap(
    await supabase
      .from("transactions")
      .select("*, vendors(name), customers(name), products(name)")
      .order("occurred_at", { ascending: false }),
  ) as Transaction[];
}

export async function createTransaction(payload: Partial<Transaction>) {
  const quantity = payload.quantity ?? 1;
  const unitPrice = payload.unit_price ?? 0;
  const { error } = await supabase.from("transactions").insert({
    vendor_id: payload.vendor_id!,
    customer_id: payload.customer_id ?? null,
    product_id: payload.product_id ?? null,
    reference: payload.reference ?? null,
    quantity,
    unit_price: unitPrice,
    total_amount: Number((quantity * unitPrice).toFixed(2)),
    status: payload.status ?? "completed",
    occurred_at: payload.occurred_at ?? new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function updateTransaction(id: string, payload: Partial<Transaction>) {
  const { vendors: _v, customers: _c, products: _p, ...rest } = payload;
  if (rest.quantity != null && rest.unit_price != null) {
    rest.total_amount = Number((rest.quantity * rest.unit_price).toFixed(2));
  }
  const { error } = await supabase.from("transactions").update(rest).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Statistics ---------------- */

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc("dashboard_stats");
  if (error) throw new Error(error.message);
  return data as unknown as DashboardStats;
}

export interface VendorRevenue {
  vendor_id: string;
  vendor_name: string;
  revenue: number;
  orders: number;
}

export async function fetchRevenueByVendor(): Promise<VendorRevenue[]> {
  const { data, error } = await supabase.rpc("revenue_by_vendor");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as VendorRevenue[];
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  orders: number;
}

export async function fetchRevenueByMonth(): Promise<MonthlyRevenue[]> {
  const { data, error } = await supabase.rpc("revenue_by_month");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MonthlyRevenue[];
}

/* ---------------- Query keys ---------------- */

export const qk = {
  vendors: ["vendors"] as const,
  products: ["products"] as const,
  customers: ["customers"] as const,
  transactions: ["transactions"] as const,
  stats: ["dashboard-stats"] as const,
  revenueVendor: ["revenue-by-vendor"] as const,
  revenueMonth: ["revenue-by-month"] as const,
};

/* ---------------- Product images ---------------- */

export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("You must be signed in to upload images");
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data, error: signError } = await supabase.storage
    .from("product-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (signError || !data) throw new Error(signError?.message ?? "Could not read uploaded image");
  return data.signedUrl;
}
