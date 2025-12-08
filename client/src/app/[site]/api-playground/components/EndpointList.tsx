"use client";

import { cn } from "@/lib/utils";
import { endpointCategories, EndpointConfig, methodColors } from "../utils/endpointConfig";
import { usePlaygroundStore } from "../hooks/usePlaygroundStore";
import { ScrollArea } from "../../../../components/ui/scroll-area";

export function EndpointList() {
  const { selectedEndpoint, setSelectedEndpoint } = usePlaygroundStore();

  return (
    <ScrollArea className="h-full overflow-y-auto border-r border-neutral-100 dark:border-neutral-850">
      <div className="p-3 border-b border-neutral-100 dark:border-neutral-850">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Endpoints</h2>
      </div>
      <div className="p-2">
        {endpointCategories.map(category => (
          <div key={category.name} className="mb-4">
            <h3 className="px-2 py-1 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              {category.name}
            </h3>
            <div className="space-y-1 mt-1">
              {category.endpoints.map(endpoint => (
                <EndpointItem
                  key={`${endpoint.method}-${endpoint.path}`}
                  endpoint={endpoint}
                  isSelected={selectedEndpoint?.path === endpoint.path && selectedEndpoint?.method === endpoint.method}
                  onClick={() => setSelectedEndpoint(endpoint)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

interface EndpointItemProps {
  endpoint: EndpointConfig;
  isSelected: boolean;
  onClick: () => void;
}

function EndpointItem({ endpoint, isSelected, onClick }: EndpointItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors",
        "hover:bg-neutral-100 dark:hover:bg-neutral-800",
        isSelected && "bg-neutral-100 dark:bg-neutral-800"
      )}
    >
      <span className={cn("shrink-0 px-1 py-0.5 text-[10px] font-bold rounded", methodColors[endpoint.method])}>
        {endpoint.method}
      </span>
      <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate">{endpoint.name}</span>
    </button>
  );
}
