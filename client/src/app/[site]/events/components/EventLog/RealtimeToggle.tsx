export function RealtimeToggle({
  isRealtime,
  onToggle,
}: {
  isRealtime: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
          isRealtime
            ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
        }`}
      >
        {isRealtime && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        )}
        Realtime
      </button>
    </div>
  );
}
