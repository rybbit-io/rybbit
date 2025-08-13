import { Card } from "./Card";

export function UserBehaviorTrends() {
  return (
    <Card 
      title="User Behavior Trends" 
      description="Discover when your users are most active with hourly and daily heatmaps."
    >
      
      <div className="mt-4 bg-neutral-900 p-4 rounded-md">
        <div className="flex justify-between items-center mb-4">
          <div className="text-base font-medium">Weekly Activity Heatmap</div>
          <div className="bg-indigo-900/30 text-indigo-400 text-sm px-2 py-1 rounded-md">
            Unique Visitors
          </div>
        </div>
        
        {/* Simplified Weekdays Heatmap */}
        <div className="flex mt-2">
          {/* Hours column */}
          <div className="w-10 flex-shrink-0">
            <div className="h-4"></div> {/* Empty space for top row with day labels */}
            {[0, 6, 12, 18].map(hour => (
              <div key={hour} className="h-4 text-xs flex items-center justify-end pr-2 text-neutral-400 my-2">
                {hour === 0 ? '12am' : hour === 12 ? '12pm' : hour > 12 ? `${hour-12}pm` : `${hour}am`}
              </div>
            ))}
          </div>
          
          {/* Heatmap grid */}
          <div className="flex-1">
            {/* Day labels */}
            <div className="flex h-5">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                <div key={i} className="flex-1 text-center text-xs text-neutral-400">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Heatmap cells - generating a static pattern */}
            <div className="grid grid-rows-4 gap-2 mt-1">
              {/* Morning hours */}
              <div className="flex h-4">
                {[
                  { bg: 'rgba(99, 102, 241, 0.1)' },
                  { bg: 'rgba(99, 102, 241, 0.2)' },
                  { bg: 'rgba(99, 102, 241, 0.3)' },
                  { bg: 'rgba(99, 102, 241, 0.4)' },
                  { bg: 'rgba(99, 102, 241, 0.3)' },
                  { bg: 'rgba(99, 102, 241, 0.1)' },
                  { bg: 'rgba(99, 102, 241, 0.1)' }
                ].map((style, i) => (
                  <div key={i} style={{ backgroundColor: style.bg }} className="flex-1 mx-0.5 rounded-sm my-0.5"></div>
                ))}
              </div>
              
              {/* Midday hours */}
              <div className="flex h-4">
                {[
                  { bg: 'rgba(99, 102, 241, 0.6)' },
                  { bg: 'rgba(99, 102, 241, 0.7)' },
                  { bg: 'rgba(99, 102, 241, 0.8)' },
                  { bg: 'rgba(99, 102, 241, 0.9)' },
                  { bg: 'rgba(99, 102, 241, 0.8)' },
                  { bg: 'rgba(99, 102, 241, 0.5)' },
                  { bg: 'rgba(99, 102, 241, 0.4)' }
                ].map((style, i) => (
                  <div key={i} style={{ backgroundColor: style.bg }} className="flex-1 mx-0.5 rounded-sm my-0.5"></div>
                ))}
              </div>
              
              {/* Afternoon hours */}
              <div className="flex h-4">
                {[
                  { bg: 'rgba(99, 102, 241, 0.9)' },
                  { bg: 'rgba(99, 102, 241, 1.0)' },
                  { bg: 'rgba(99, 102, 241, 0.9)' },
                  { bg: 'rgba(99, 102, 241, 0.8)' },
                  { bg: 'rgba(99, 102, 241, 0.9)' },
                  { bg: 'rgba(99, 102, 241, 0.7)' },
                  { bg: 'rgba(99, 102, 241, 0.5)' }
                ].map((style, i) => (
                  <div key={i} style={{ backgroundColor: style.bg }} className="flex-1 mx-0.5 rounded-sm my-0.5"></div>
                ))}
              </div>
              
              {/* Evening hours */}
              <div className="flex h-4">
                {[
                  { bg: 'rgba(99, 102, 241, 0.5)' },
                  { bg: 'rgba(99, 102, 241, 0.6)' },
                  { bg: 'rgba(99, 102, 241, 0.5)' },
                  { bg: 'rgba(99, 102, 241, 0.4)' },
                  { bg: 'rgba(99, 102, 241, 0.6)' },
                  { bg: 'rgba(99, 102, 241, 0.8)' },
                  { bg: 'rgba(99, 102, 241, 0.7)' }
                ].map((style, i) => (
                  <div key={i} style={{ backgroundColor: style.bg }} className="flex-1 mx-0.5 rounded-sm my-0.5"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-3 flex items-center justify-center">
          <div className="flex items-center gap-1">
            <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }} className="w-3 h-3 rounded-sm"></div>
            <span className="text-xs text-neutral-400">Low</span>
          </div>
          <div className="mx-2 w-12 h-1" style={{ background: 'linear-gradient(to right, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 1))' }}></div>
          <div className="flex items-center gap-1">
            <div style={{ backgroundColor: 'rgba(99, 102, 241, 1)' }} className="w-3 h-3 rounded-sm"></div>
            <span className="text-xs text-neutral-400">High</span>
          </div>
        </div>
        
        <div className="mt-3 text-xs text-center text-neutral-500">
          Weekday afternoons show highest user engagement
        </div>
      </div>
    </Card>
  );
}