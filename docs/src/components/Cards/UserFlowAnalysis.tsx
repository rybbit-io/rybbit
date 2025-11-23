import { Card } from "./Card";
import { ChevronRight, TrendingDown, Users } from "lucide-react";

export function UserFlowAnalysis() {
  return (
    <Card
      title="User Flow Analysis"
      description="Visualize how users navigate through your site with intuitive path analysis tools."
    >
      <div className="mt-4 bg-neutral-900 rounded-lg p-4">
        {/* Header with metrics */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium">Top Paths from Homepage</span>
          </div>
          <span className="text-xs text-neutral-400">Last 7 days</span>
        </div>

        {/* Sankey-style flow visualization */}
        <div className="space-y-4">
          {/* Path 1: Homepage → Products → Checkout */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 text-xs">
              <div className="px-2 py-1.5 bg-emerald-900/30 border border-emerald-500/40 rounded">
                Home
              </div>
              <ChevronRight className="w-3 h-3 text-neutral-500" />
              <div className="px-2 py-1.5 bg-blue-900/30 border border-blue-500/40 rounded">
                Products
              </div>
              <ChevronRight className="w-3 h-3 text-neutral-500" />
              <div className="px-2 py-1.5 bg-orange-900/30 border border-orange-500/40 rounded">
                Checkout
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-orange-400">324</div>
              <div className="text-xs text-neutral-500">26%</div>
            </div>
          </div>

          {/* Path 2: Homepage → Features → Sign Up */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 text-xs">
              <div className="px-2 py-1.5 bg-emerald-900/30 border border-emerald-500/40 rounded">
                Home
              </div>
              <ChevronRight className="w-3 h-3 text-neutral-500" />
              <div className="px-2 py-1.5 bg-purple-900/30 border border-purple-500/40 rounded">
                Features
              </div>
              <ChevronRight className="w-3 h-3 text-neutral-500" />
              <div className="px-2 py-1.5 bg-orange-900/30 border border-orange-500/40 rounded">
                Sign Up
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-orange-400">198</div>
              <div className="text-xs text-neutral-500">16%</div>
            </div>
          </div>

          {/* Path 3: Homepage → Pricing → Contact */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 text-xs">
              <div className="px-2 py-1.5 bg-emerald-900/30 border border-emerald-500/40 rounded">
                Home
              </div>
              <ChevronRight className="w-3 h-3 text-neutral-500" />
              <div className="px-2 py-1.5 bg-cyan-900/30 border border-cyan-500/40 rounded">
                Pricing
              </div>
              <ChevronRight className="w-3 h-3 text-neutral-500" />
              <div className="px-2 py-1.5 bg-orange-900/30 border border-orange-500/40 rounded">
                Contact
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-orange-400">145</div>
              <div className="text-xs text-neutral-500">12%</div>
            </div>
          </div>

          {/* Path 4: Homepage → About → Exit */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 text-xs">
              <div className="px-2 py-1.5 bg-emerald-900/30 border border-emerald-500/40 rounded">
                Home
              </div>
              <ChevronRight className="w-3 h-3 text-neutral-500" />
              <div className="px-2 py-1.5 bg-violet-900/30 border border-violet-500/40 rounded">
                About
              </div>
              <ChevronRight className="w-3 h-3 text-neutral-500" />
              <div className="flex items-center gap-1 px-2 py-1.5 bg-red-900/20 border border-red-500/30 rounded">
                <TrendingDown className="w-3 h-3" />
                <span>Exit</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-red-400">98</div>
              <div className="text-xs text-neutral-500">8%</div>
            </div>
          </div>
        </div>

        {/* Summary metrics */}
        <div className="mt-5 pt-4 border-t border-neutral-800 grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-neutral-400">Pages/Session</div>
            <div className="text-sm font-medium mt-1">3.2</div>
          </div>
          <div>
            <div className="text-xs text-neutral-400">Drop-off Rate</div>
            <div className="text-sm font-medium text-red-400 mt-1">45%</div>
          </div>
          <div>
            <div className="text-xs text-neutral-400">Conversion Rate</div>
            <div className="text-sm font-medium text-emerald-400 mt-1">38%</div>
          </div>
        </div>
      </div>
    </Card>
  );
}