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
        "flex flex-col overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/50 p-5 md:p-6",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="h-[18px] w-[18px] shrink-0 text-neutral-500 dark:text-neutral-400" />}
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
      </div>
      {description && (
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{description}</p>
      )}
      {children}
    </div>
  );
}

/* A product "screen" peeking into the card from the bottom-right corner.
   Shared by every showcase card so the motif reads as one system: hairline
   top/left seam, canvas-colored surface, clipped by the card's rounding. */
export function CardScreen({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="mt-6 flex grow flex-col justify-end">
      <div
        className={cn(
          "relative -mb-5 -mr-5 ml-4 overflow-hidden rounded-tl-lg border-l border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 md:-mb-6 md:-mr-6 md:ml-10",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
