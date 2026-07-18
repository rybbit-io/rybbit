import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface CardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
}

export function Card({ title, description, children, className, icon: Icon }: CardProps) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
        className
      )}
    >
      <div className="px-6 pt-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-white">
          {Icon && <Icon className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />}
          {title}
        </h3>
        {description && <p className="mt-1.5 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/**
 * The clipped "window" every card mock renders into. One height, one hairline
 * top edge, one inset — this is what keeps the four showcase cards visually
 * consistent with each other.
 */
export function CardViewport({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative mt-6 h-72 overflow-hidden border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950",
        className
      )}
    >
      {children}
    </div>
  );
}
