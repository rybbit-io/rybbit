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
      className={cn("bg-neutral-100/50 dark:bg-neutral-800/20 p-4 md:p-6 rounded-xl border border-neutral-300/50 dark:border-neutral-800/50 overflow-hidden", className)}
    >
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600/20 to-emerald-700/15 dark:from-emerald-600/15 dark:to-emerald-700/10 border border-emerald-600/30 dark:border-emerald-600/20 shadow-md shadow-emerald-600/10 dark:shadow-emerald-600/5 flex items-center justify-center mb-3">
          <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
        </div>
      )}
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      {description && <p className="text-neutral-600 dark:text-neutral-300 text-sm mb-3">{description}</p>}
      {children}
    </div>
  );
}
