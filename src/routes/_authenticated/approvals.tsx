import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { EmptyState, TableSkeleton } from "@/components/table-parts";
import { Button } from "@/components/ui/button";
import { listVendors, qk, updateVendor, type Vendor } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals — ShopSense" },
      { name: "description", content: "Review and action vendor applications waiting for approval." },
      { property: "og:title", content: "Approvals — ShopSense" },
      {
        property: "og:description",
        content: "Review and action vendor applications waiting for approval.",
      },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: qk.vendors, queryFn: listVendors });
  const pending = (data ?? []).filter((vendor) => vendor.status === "pending");

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Vendor["status"] }) =>
      updateVendor(id, { status }),
    onSuccess: () => {
      toast.success("Decision saved");
      void queryClient.invalidateQueries({ queryKey: qk.vendors });
      void queryClient.invalidateQueries({ queryKey: qk.stats });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Vendor applications awaiting a decision before they can start selling."
      />
      <div className="surface-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton cols={4} />
        ) : pending.length === 0 ? (
          <EmptyState title="Queue is clear" description="No vendor applications are waiting for review." />
        ) : (
          <ul className="divide-y divide-border">
            {pending.map((vendor) => (
              <li key={vendor.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{vendor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {vendor.category} · {vendor.contact_email} · applied {formatDate(vendor.created_at)}
                  </p>
                </div>
                <StatusPill status={vendor.status} />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => decide.mutate({ id: vendor.id, status: "rejected" })}
                  >
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => decide.mutate({ id: vendor.id, status: "approved" })}>
                    Approve
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
