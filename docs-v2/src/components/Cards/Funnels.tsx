import { Card } from "./Card";
import { Filter } from "lucide-react";

export function Funnels() {
  return (
    <Card
      title="Conversion Funnels"
      description="Visualize user journeys and identify where users drop off."
    >
      <div className="bg-neutral-900 rounded-lg p-4 h-[200px] flex items-center justify-center">
        <Filter className="w-16 h-16 text-neutral-600 rotate-180" />
      </div>
    </Card>
  );
}