"use client";

export interface LegendItem {
  id: string;
  color: string;
}

interface ChartLegendProps {
  items: LegendItem[];
  hiddenItems: Set<string>;
  onToggle: (id: string) => void;
}

export function ChartLegend({ items, hiddenItems, onToggle }: ChartLegendProps) {
  if (items.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-2 md:px-0 text-xs text-neutral-500 dark:text-neutral-400">
      {items.map(item => {
        const isHidden = hiddenItems.has(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={`flex items-center gap-2 max-w-[200px] text-left transition-opacity cursor-pointer ${isHidden ? "opacity-40" : "opacity-100"
              }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className={`truncate ${isHidden ? "line-through" : ""}`} title={item.id}>
              {item.id}
            </span>
          </button>
        );
      })}
    </div>
  );
}
