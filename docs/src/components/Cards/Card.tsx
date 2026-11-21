import { cn } from "@/lib/utils";

interface CardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, description, children, className }: CardProps) {
  return (
    <div
      className={cn("flex h-full flex-col overflow-hidden bg-white p-5 dark:bg-neutral-950 md:p-8", className)}
    >
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      {description && <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-400">{description}</p>}
      {children}
    </div>
  );
}
