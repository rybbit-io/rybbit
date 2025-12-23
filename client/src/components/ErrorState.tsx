import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";

export function ErrorState({ title, message, refetch }: { title: string; message: string; refetch?: () => void }) {
  return (
    <div className="py-6 flex-1 flex flex-col items-center justify-center gap-3 transition-all">
      <AlertCircle className="text-amber-400 w-8 h-8" />
      <div className="text-center">
        <div className="text-neutral-900 dark:text-neutral-100 font-medium mb-1">{title || "Failed to load data"}</div>
        <div className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-3">
          {message || "An error occurred while fetching data"}
        </div>
      </div>
      {refetch && (
        <Button
          variant="outline"
          size="sm"
          className="bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
          onClick={() => refetch()}
        >
          <RefreshCcw className="w-3 h-3" /> Try Again
        </Button>
      )}
    </div>
  );
}
