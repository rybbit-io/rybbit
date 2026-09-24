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
      className={cn("flex h-full flex-col overflow-hidden bg-white p-5 dark:bg-neutral-950 md:p-8", className)}
    >
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      </div>
      {description && <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">{description}</p>}
      {children}
    </div>
  );
}
