import type { ExperimentStatus } from "@/api/analytics/endpoints";
import { Badge } from "@/components/ui/badge";
import { statusLabel } from "../lib/experimentHelpers";

export function StatusBadge({ status }: { status: ExperimentStatus }) {
  const variant =
    status === "running" ? "success" : status === "completed" ? "info" : status === "paused" ? "warning" : "secondary";

  return <Badge variant={variant}>{statusLabel(status)}</Badge>;
}
