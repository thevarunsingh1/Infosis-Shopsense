import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Store,
  Package,
  ChartLine,
  FileText,
  BadgeCheck,
  Settings,
  Menu,
  LogOut,
  Search,
  Bell,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/vendors", label: "Vendors", icon: Store },
  { to: "/products", label: "Products", icon: Package },
  { to: "/analytics", label: "Analytics", icon: ChartLine },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/approvals", label: "Approvals", icon: BadgeCheck },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-6">
      <div className="brand-gradient grid size-9 place-items-center rounded-xl font-display text-base font-bold text-primary-foreground">
        S
      </div>
      <div className="leading-tight">
        <p className="font-display text-base font-semibold text-sidebar-accent-foreground">
          ShopSense
        </p>
        <p className="text-[11px] uppercase tracking-[0.16em] text-sidebar-foreground/60">
          Vendor OS
        </p>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map((item) => {
        const active = pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className={cn("size-[18px]", active && "text-sidebar-primary")} />
            {item.label}
            {active && <span className="ml-auto size-1.5 rounded-full bg-sidebar-primary" />}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, isAdmin } = useAuth();
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <Brand />
      <NavList onNavigate={onNavigate} />
      <div className="m-3 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-4">
        <p className="text-xs font-medium text-sidebar-accent-foreground">
          {isAdmin ? "Administrator access" : "Vendor workspace"}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-sidebar-foreground/60">
          {isAdmin
            ? "You can review every vendor, product and transaction on the platform."
            : "You can manage your own storefront, catalogue and sales."}
        </p>
        <p className="mt-3 truncate text-[11px] text-sidebar-foreground/50">{profile?.email}</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { profile, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-r border-sidebar-border lg:block">
        <SidebarInner />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[248px] border-sidebar-border p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarInner onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="relative hidden max-w-sm flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vendors, products, orders…"
              className="h-9 rounded-lg border-border bg-muted/60 pl-9"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Badge
              variant="outline"
              className="hidden border-primary/30 bg-accent text-accent-foreground sm:inline-flex"
            >
              {isAdmin ? "Admin" : "Vendor"}
            </Badge>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-[18px]" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 transition-shadow hover:shadow-sm">
                  <span className="ink-gradient grid size-7 place-items-center rounded-full text-xs font-semibold text-primary-foreground">
                    {initials(profile?.full_name ?? user?.email)}
                  </span>
                  <span className="hidden max-w-[120px] truncate text-sm font-medium sm:block">
                    {profile?.full_name ?? user?.email ?? "Account"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{profile?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void handleSignOut()}>
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
