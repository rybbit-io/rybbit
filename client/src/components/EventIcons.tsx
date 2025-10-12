import { ExternalLink, Eye, MousePointerClick, TriangleAlert } from "lucide-react";
import { cn } from "../lib/utils";

export function PageviewIcon({ className }: { className?: string }) {
  return <Eye className={cn("h-4 w-4  text-blue-400", className)} />;
}

export function EventIcon({ className }: { className?: string }) {
  return <MousePointerClick className={cn("h-4 w-4 text-amber-400", className)} />;
}

export function ErrorIcon({ className }: { className?: string }) {
  return <TriangleAlert className={cn("w-4 h-4 text-red-500", className)} />;
}

export function OutboundLinkIcon({ className }: { className?: string }) {
  return <ExternalLink className={cn("w-4 h-4 text-purple-500", className)} />;
}
