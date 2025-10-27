import Avatar from "boring-avatars";
import { Laptop } from "lucide-react";
import { cn } from "@/lib/utils";
import { Browser } from "../Browser";
import { CountryFlag } from "../Country";
import { OperatingSystem } from "../OperatingSystem";
import { Card } from "./Card";



export function UserProfiles() {
  return (
    <Card 
      title="User Profiles"
      description="Know who your users are and exactly what they do."
    >
      <div className="bg-neutral-900 p-4 rounded-md">
        <div className="flex items-start gap-4">
          {/* User basic info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Avatar
                size={32}
                name={"bill"}
                variant="marble"
                colors={["#226756", "#6eaaa3", "#e8e8e8", "#bbc1e2", "#7182d6"]}
              />
              <div>
                <div className="text-neutral-50">8a4f3d7e</div>
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <CountryFlag country="US" />
                  <OperatingSystem os="macOS" />
                  <Browser browser="Chrome" />
                  <Laptop className="w-4 h-4" />
                </div>
              </div>
            </div>
          
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-neutral-800/50 p-2 rounded-md">
                <div className="text-xs text-neutral-400">First seen</div>
                <div className="text-sm">Jan 12, 2023</div>
              </div>
              <div className="bg-neutral-800/50 p-2 rounded-md">
                <div className="text-xs text-neutral-400">Last seen</div>
                <div className="text-sm">Today, 2:34 PM</div>
              </div>
              <div className="bg-neutral-800/50 p-2 rounded-md">
                <div className="text-xs text-neutral-400">Sessions</div>
                <div className="text-sm font-medium">48</div>
              </div>
              <div className="bg-neutral-800/50 p-2 rounded-md">
                <div className="text-xs text-neutral-400">Pageviews</div>
                <div className="text-sm font-medium">134</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Activity calendar grid */}
        <div className="mt-4">
          <div className="text-xs text-neutral-400 mb-2">Activity</div>
          <div className="flex gap-1">
            {/* Column labels (months) */}
            <div className="flex flex-col gap-1 justify-end pr-1">
              <div className="text-[9px] text-neutral-500">Jan</div>
              <div className="text-[9px] text-neutral-500">Feb</div>
              <div className="text-[9px] text-neutral-500">Mar</div>
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-18 gap-1">
              {Array(54).fill(null).map((_, i) => {
                // Randomly determine activity level (0-4)
                const activityLevel = Math.floor(Math.random() * 5);
                
                // Set color based on activity level
                let bgColor = 'bg-neutral-800';
                if (activityLevel === 1) bgColor = 'bg-emerald-900';
                if (activityLevel === 2) bgColor = 'bg-emerald-800';
                if (activityLevel === 3) bgColor = 'bg-emerald-700';
                if (activityLevel === 4) bgColor = 'bg-emerald-600';
                
                return (
                  <div 
                    key={i} 
                    className={cn("w-3 h-3 rounded-sm", bgColor)}
                    title={`${activityLevel} visits`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}