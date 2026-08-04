import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  icon: LucideIcon;
  loading?: boolean;
  index?: number;
}

export function StatCard({ label, value, delta, hint, icon: Icon, loading, index = 0 }: StatCardProps) {
  const positive = (delta ?? 0) >= 0;

  return (
    <div
      className="surface-card animate-rise p-5 transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-[18px]" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-4 h-8 w-28" />
      ) : (
        <p className="mt-4 font-display text-3xl font-semibold tracking-tight">{value}</p>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
              positive ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive",
            )}
          >
            {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {positive ? "+" : ""}
            {delta}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
