import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

/*
 * Shell for the product-showcase cards. Flat surface, hairline border, no
 * resting shadow. Mock UIs inside use CARD_WELL: an inset "screen" that bleeds
 * off the card's bottom-right corner with a consistent treatment, replacing the
 * old per-card rotate/translate gimmicks.
 */

export const CARD_WELL =
  "relative mt-5 ml-2 -mr-4 md:-mr-6 -mb-4 md:-mb-6 h-[320px] overflow-hidden rounded-tl-xl border-t border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#101010] p-4";

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
        "relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-4 md:p-6",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-4 shrink-0 text-neutral-500 dark:text-neutral-400" />}
        <h3 className="text-lg font-semibold tracking-tight text-neutral-950 dark:text-white">{title}</h3>
      </div>
      {description && (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{description}</p>
      )}
      {children}
    </div>
  );
}
