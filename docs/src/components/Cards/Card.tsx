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
        "flex h-full min-h-[430px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 p-5 md:p-6 dark:border-neutral-800 dark:bg-neutral-900",
        className
      )}
    >
      <div className="flex items-start gap-3 border-b border-neutral-200 pb-5 dark:border-neutral-800">
        {Icon && (
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-400">
            <Icon className="size-4" />
          </div>
        )}
        <div>
          <h3 className="mb-1.5 text-lg font-semibold tracking-tight">{title}</h3>
          {description && <p className="max-w-[52ch] text-sm leading-6 text-neutral-600 dark:text-neutral-400">{description}</p>}
        </div>
      </div>
      <div className="mt-auto">{children}</div>
    </div>
  );
}
