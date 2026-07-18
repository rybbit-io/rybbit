import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface CardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
}

/**
 * Flat product-preview card: a header row plus an inset "screen" that the
 * animated mock UI lives in. The screen is bottom-cropped like a viewport.
 */
export function Card({ title, description, children, className, icon: Icon }: CardProps) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
        className
      )}
    >
      <div className="px-5 pt-5 md:px-6 md:pt-6">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />}
          <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</h3>
        </div>
        {description && <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
      </div>
      <div className="mt-5 flex-1 px-5 md:px-6">{children}</div>
    </div>
  );
}

/** Shared classes for the inset viewport each preview renders into. */
export const previewScreen =
  "h-[300px] overflow-hidden rounded-t-md border border-b-0 border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950";
