import type { ExperimentStatus } from "@/api/analytics/endpoints";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabel } from "../lib/experimentHelpers";

export function StatusBadge({ status }: { status: ExperimentStatus }) {
  const variant =
    status === "running" ? "success" : status === "completed" ? "info" : status === "paused" ? "warning" : "secondary";

  const dotColor =
    status === "running"
      ? "bg-emerald-500"
      : status === "completed"
        ? "bg-blue-500"
        : status === "paused"
          ? "bg-yellow-500"
          : "bg-neutral-400 dark:bg-neutral-500";

  return (
    <Badge variant={variant} className="gap-1.5">
      <span className="relative flex h-1.5 w-1.5">
        {status === "running" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dotColor)} />
      </span>
      {statusLabel(status)}
    </Badge>
  );
}
