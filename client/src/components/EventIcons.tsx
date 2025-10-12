import { Eye, MousePointerClick } from "lucide-react";
import { cn } from "../lib/utils";

export function PageviewIcon({ className }: { className?: string }) {
  return <Eye className={cn("h-4 w-4  text-blue-400", className)} />;
}

export function EventIcon({ className }: { className?: string }) {
  return <MousePointerClick className={cn("h-4 w-4 text-amber-400", className)} />;
}
