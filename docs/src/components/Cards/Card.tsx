import { cn } from "@/lib/utils";

interface CardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, description, children, className }: CardProps) {
  return (
    <div className={cn("bg-neutral-800/20 p-6 rounded-xl border border-neutral-800/50", className)}>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      {description && <p className="text-neutral-300 mb-4">{description}</p>}
      {children}
    </div>
  );
}
