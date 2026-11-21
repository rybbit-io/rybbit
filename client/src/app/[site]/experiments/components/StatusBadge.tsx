import type { ExperimentStatus } from "@/api/analytics/endpoints";
import { Badge } from "@/components/ui/badge";
import { statusLabel } from "../lib/experimentHelpers";

const VARIANTS = { running: "success", completed: "info", paused: "warning", draft: "secondary" } as const;

export function StatusBadge({ status }: { status: ExperimentStatus }) {
  return <Badge variant={VARIANTS[status]}>{statusLabel(status)}</Badge>;
}
