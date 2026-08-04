import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  approved: "bg-accent text-accent-foreground ring-primary/25",
  active: "bg-accent text-accent-foreground ring-primary/25",
  completed: "bg-accent text-accent-foreground ring-primary/25",
  pending: "bg-warning/15 text-warning-foreground ring-warning/30",
  draft: "bg-muted text-muted-foreground ring-border",
  archived: "bg-muted text-muted-foreground ring-border",
  cancelled: "bg-muted text-muted-foreground ring-border",
  rejected: "bg-destructive/10 text-destructive ring-destructive/25",
  suspended: "bg-destructive/10 text-destructive ring-destructive/25",
  refunded: "bg-info/12 text-info ring-info/25",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset",
        TONE[status] ?? "bg-muted text-muted-foreground ring-border",
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
