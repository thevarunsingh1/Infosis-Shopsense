import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ShopSense" },
      { name: "description", content: "Your ShopSense account details, role and workspace preferences." },
      { property: "og:title", content: "Settings — ShopSense" },
      {
        property: "og:description",
        content: "Your ShopSense account details, role and workspace preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, user, isAdmin } = useAuth();

  return (
    <>
      <PageHeader title="Settings" description="Your account details and workspace access level." />
      <div className="surface-card max-w-xl space-y-4 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" readOnly value={profile?.full_name ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" readOnly value={profile?.email ?? user?.email ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role">Access level</Label>
          <Input id="role" readOnly value={isAdmin ? "Administrator" : "Vendor"} />
        </div>
        <p className="text-xs text-muted-foreground">
          Roles are managed centrally for security and can only be changed by an administrator.
        </p>
      </div>
    </>
  );
}
