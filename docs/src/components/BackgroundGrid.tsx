import { cn } from "@/lib/utils";

interface BackgroundGridProps {
  className?: string;
}

export function BackgroundGrid({ className }: BackgroundGridProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 -top-32 md:-top-48",
        "[background-size:40px_40px]",
        "[background-image:linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)]",
        "dark:[background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]",
        "[mask-image:linear-gradient(to_bottom,black,transparent_80%),linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]",
        "[mask-composite:intersect]",
        className
      )}
    />
  );
}
