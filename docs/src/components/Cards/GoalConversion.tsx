import { Card } from "./Card";

export function GoalConversion() {
  return (
    <Card 
      title="Goal Conversion" 
      description="Set up and track conversion goals to measure the success of your key objectives."
    >
      
      <div className="mt-4 bg-neutral-900 p-4 rounded-md">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">Newsletter Signup</span>
              <span className="text-emerald-400 text-sm font-bold">8.7%</span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-2">
              <div className="bg-emerald-400 h-2 rounded-full" style={{ width: '8.7%' }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">Free Trial Registration</span>
              <span className="text-emerald-400 text-sm font-bold">12.4%</span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-2">
              <div className="bg-emerald-400 h-2 rounded-full" style={{ width: '12.4%' }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">Product Purchase</span>
              <span className="text-emerald-400 text-sm font-bold">3.2%</span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-2">
              <div className="bg-emerald-400 h-2 rounded-full" style={{ width: '3.2%' }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">Support Contact</span>
              <span className="text-emerald-400 text-sm font-bold">5.8%</span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-2">
              <div className="bg-emerald-400 h-2 rounded-full" style={{ width: '5.8%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}