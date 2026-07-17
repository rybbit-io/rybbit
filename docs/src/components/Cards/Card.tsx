import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

/**
 * Shared frame for the product mock-ups inside landing cards: a recessed
 * "screen" pinned to the card's right edge and cropped by the card bounds.
 * Consumers add their own padding and negative bottom margin for the crop.
 */
export const cardVisualFrame =
  "mt-6 ml-6 sm:ml-12 -mr-5 md:-mr-7 rounded-tl-xl border border-neutral-200 bg-white transition-transform duration-500 ease-out group-hover:-translate-y-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 dark:border-neutral-800 dark:bg-neutral-950";

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
        "group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50/60 p-5 md:p-7 dark:border-neutral-800 dark:bg-neutral-900/40",
        className
      )}
    >
      <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        {Icon && <Icon className="h-[18px] w-[18px] shrink-0 text-emerald-600 dark:text-emerald-400" />}
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{description}</p>
      )}
      {children}
    </div>
  );
}
