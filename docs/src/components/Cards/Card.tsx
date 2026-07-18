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
        "flex flex-col overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 md:p-6",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="h-[18px] w-[18px] text-neutral-400 dark:text-neutral-500" />}
        <h3 className="text-base md:text-lg font-semibold">{title}</h3>
      </div>
      {description && <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>}
      {children}
    </div>
  );
}
