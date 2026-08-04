import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { EmptyState, TablePagination, TableSkeleton, TableToolbar } from "@/components/table-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTableState } from "@/hooks/use-table-state";
import { createVendor, deleteVendor, listVendors, qk, updateVendor, type Vendor } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/vendors")({
  head: () => ({
    meta: [
      { title: "Vendors — ShopSense" },
      { name: "description", content: "Create, review and manage every vendor account in ShopSense." },
      { property: "og:title", content: "Vendors — ShopSense" },
      {
        property: "og:description",
        content: "Create, review and manage every vendor account in ShopSense.",
      },
    ],
  }),
  component: VendorsPage,
});

function VendorsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: qk.vendors, queryFn: listVendors });
  const table = useTableState<Vendor>(data ?? [], (row) => `${row.name} ${row.contact_email} ${row.category}`);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact_email: "", category: "", city: "" });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: qk.vendors });
    void queryClient.invalidateQueries({ queryKey: qk.stats });
  };

  const create = useMutation({
    mutationFn: () => createVendor({ ...form, status: "pending" }),
    onSuccess: () => {
      toast.success("Vendor created");
      setOpen(false);
      setForm({ name: "", contact_email: "", category: "", city: "" });
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => {
      toast.success("Vendor removed");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Vendor["status"] }) =>
      updateVendor(id, { status }),
    onSuccess: () => {
      toast.success("Vendor updated");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader
        title="Vendors"
        description="Every partner selling through ShopSense, with approval status and contact details."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> New vendor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add vendor</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {(
                  [
                    ["name", "Vendor name"],
                    ["contact_email", "Contact email"],
                    ["category", "Category"],
                    ["city", "City"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      value={form[key]}
                      onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button
                  onClick={() => create.mutate()}
                  disabled={!form.name || !form.contact_email || create.isPending}
                >
                  Create vendor
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="surface-card overflow-hidden">
        <TableToolbar
          search={table.search}
          onSearch={table.setSearch}
          placeholder="Search vendors by name, email or category…"
        />
        {isLoading ? (
          <TableSkeleton />
        ) : table.rows.length === 0 ? (
          <EmptyState title="No vendors found" description="Try a different search, or add your first vendor." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {table.rows.map((vendor) => (
                  <tr key={vendor.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <p className="font-medium">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground">{vendor.contact_email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{vendor.category}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {[vendor.city, vendor.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={vendor.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(vendor.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {vendor.status !== "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus.mutate({ id: vendor.id, status: "approved" })}
                          >
                            Approve
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => remove.mutate(vendor.id)}
                          aria-label={`Delete ${vendor.name}`}
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
    </>
  );
}
