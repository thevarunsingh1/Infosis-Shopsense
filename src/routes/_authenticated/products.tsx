import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Pencil, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { EmptyState, TablePagination, TableSkeleton, TableToolbar } from "@/components/table-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTableState } from "@/hooks/use-table-state";
import {
  createProduct,
  deleteProduct,
  listProducts,
  listVendors,
  qk,
  updateProduct,
  uploadProductImage,
  type Product,
  type ProductStatus,
} from "@/lib/data";
import { analyzeProductImage, enrichProduct } from "@/lib/ai.functions";
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

type FormState = {
  vendor_id: string;
  name: string;
  sku: string;
  category: string;
  price: string;
  stock: string;
  status: ProductStatus;
  description: string;
  seo_description: string;
  image_url: string;
  tags: string;
  keywords: string;
};

const emptyForm: FormState = {
  vendor_id: "",
  name: "",
  sku: "",
  category: "General",
  price: "0",
  stock: "0",
  status: "active",
  description: "",
  seo_description: "",
  image_url: "",
  tags: "",
  keywords: "",
};

function ProductsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: qk.products, queryFn: listProducts });
  const vendors = useQuery({ queryKey: qk.vendors, queryFn: listVendors });
  const table = useTableState<Product>(
    data ?? [],
    (row) => `${row.name} ${row.sku ?? ""} ${row.category} ${row.vendors?.name ?? ""}`,
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const enrich = useServerFn(enrichProduct);
  const analyze = useServerFn(analyzeProductImage);

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: qk.products });
    void queryClient.invalidateQueries({ queryKey: qk.stats });
  };

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, vendor_id: vendors.data?.[0]?.id ?? "" });
    setOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      vendor_id: product.vendor_id,
      name: product.name,
      sku: product.sku ?? "",
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
      status: product.status,
      description: product.description ?? "",
      seo_description: product.seo_description ?? "",
      image_url: product.image_url ?? "",
      tags: product.tags.join(", "),
      keywords: product.keywords.join(", "),
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        vendor_id: form.vendor_id,
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        category: form.category.trim() || "General",
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        status: form.status,
        description: form.description.trim() || null,
        seo_description: form.seo_description.trim() || null,
        image_url: form.image_url.trim() || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        keywords: form.keywords.split(",").map((t) => t.trim()).filter(Boolean),
      };
      if (editing) await updateProduct(editing.id, payload);
      else await createProduct(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Product updated" : "Product added");
      setOpen(false);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      toast.success("Product removed");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const aiText = useMutation({
    mutationFn: () =>
      enrich({ data: { name: form.name, category: form.category, notes: form.description } }),
    onSuccess: (result) => {
      set({
        seo_description: result.seo_description,
        tags: result.tags.join(", "),
        keywords: result.keywords.join(", "),
      });
      toast.success("AI copy generated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const aiVision = useMutation({
    mutationFn: () => analyze({ data: { imageUrl: form.image_url } }),
    onSuccess: (result) => {
      set({
        category: result.category,
        tags: result.tags.join(", "),
        description: form.description || result.summary,
      });
      toast.success("Image analysed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      set({ image_url: url });
      toast.success("Image uploaded");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Products"
        description="The full catalogue across every vendor, with pricing, stock and listing status."
        actions={
          <Button onClick={openCreate} disabled={!vendors.data?.length}>
            <Plus className="size-4" /> New product
          </Button>
        }
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
          <EmptyState
            title="No products found"
            description="Add your first product, or adjust your search to see more of the catalogue."
          />
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
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {table.rows.map((product) => (
                  <tr key={product.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            loading="lazy"
                            className="size-10 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <ImagePlus className="size-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sku ?? "No SKU"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{product.vendors?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                    <td className="px-4 py-3 tabular-nums">{currencyPrecise.format(product.price)}</td>
                    <td className="px-4 py-3 tabular-nums">{product.stock}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={product.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(product)}
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => remove.mutate(product.id)}
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                {form.image_url ? (
                  <img src={form.image_url} alt="Product preview" className="size-full object-cover" />
                ) : (
                  <ImagePlus className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleFile(file);
                    event.target.value = "";
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                    Upload image
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!form.image_url || aiVision.isPending}
                    onClick={() => aiVision.mutate()}
                  >
                    {aiVision.isPending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                    Auto-categorise
                  </Button>
                </div>
                <Input
                  value={form.image_url}
                  onChange={(event) => set({ image_url: event.target.value })}
                  placeholder="…or paste an image URL"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name">Product name</Label>
                <Input id="name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Vendor</Label>
                <Select value={form.vendor_id} onValueChange={(value) => set({ vendor_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(vendors.data ?? []).map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" value={form.sku} onChange={(e) => set({ sku: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={form.category} onChange={(e) => set({ category: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => set({ status: value as ProductStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => set({ price: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => set({ stock: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={2}
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="seo">SEO description</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!form.name || aiText.isPending}
                  onClick={() => aiText.mutate()}
                >
                  {aiText.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Generate with AI
                </Button>
              </div>
              <Textarea
                id="seo"
                rows={3}
                value={form.seo_description}
                onChange={(e) => set({ seo_description: e.target.value })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input id="tags" value={form.tags} onChange={(e) => set({ tags: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="keywords">Keywords (comma separated)</Label>
                <Input id="keywords" value={form.keywords} onChange={(e) => set({ keywords: e.target.value })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => save.mutate()}
              disabled={!form.name || !form.vendor_id || save.isPending}
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
