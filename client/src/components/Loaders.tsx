import { cn } from "../lib/utils";

export function ThreeDotLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center items-center h-[500px]", className)}>
      <div className="animate-pulse flex items-center">
        <div className="h-2 w-2 bg-neutral-600 dark:bg-neutral-500 rounded-full mr-1 animate-bounce"></div>
        <div className="h-2 w-2 bg-neutral-600 dark:bg-neutral-500 rounded-full mr-1 animate-bounce [animation-delay:0.2s]"></div>
        <div className="h-2 w-2 bg-neutral-600 dark:bg-neutral-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
      </div>
    </div>
  );
}
