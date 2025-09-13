import { Card } from "./Card";
import { Filter } from "lucide-react";

export function AdvancedFilters() {
  return (
    <Card
      title="Advanced Filters"
      description="Filter data by any dimension to get the insights you need."
    >
      <div className="bg-neutral-900 rounded-lg p-4 h-[200px] flex items-center justify-center">
        <Filter className="w-16 h-16 text-neutral-600" />
      </div>
    </Card>
  );
}