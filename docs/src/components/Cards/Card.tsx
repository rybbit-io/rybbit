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
        "overflow-hidden rounded-xl border border-border bg-neutral-50/80 p-5 md:p-6 dark:bg-neutral-900/40",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />}
        <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h3>
      </div>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{description}</p>
      )}
      {children}
    </div>
  );
}
