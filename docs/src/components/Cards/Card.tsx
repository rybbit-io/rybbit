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
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-lg border border-neutral-300 bg-white dark:border-neutral-800 dark:bg-neutral-900",
        className
      )}
    >
      <div className="flex items-start gap-4 p-6 md:p-8">
        {Icon && (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
        <div>
          <h3 className="text-xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-white md:text-2xl">
            {title}
          </h3>
          {description && (
            <p className="mt-2 max-w-[55ch] text-sm leading-6 text-neutral-600 dark:text-neutral-300 md:text-base">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-auto border-t border-neutral-300 bg-neutral-950 p-2 dark:border-neutral-800 md:p-3">
        {children}
      </div>
    </article>
  );
}
