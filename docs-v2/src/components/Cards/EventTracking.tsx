import { Card } from "./Card";

export function EventTracking() {
  return (
    <Card 
      title="Event Tracking" 
      description="Monitor user interactions with your site including clicks, form submissions, and custom events."
    >
      
      <div className="mt-4 bg-neutral-900 p-4 rounded-md">
        <div className="flex items-center mb-3">
          <div className="w-3 h-3 bg-emerald-400 rounded-full mr-2"></div>
          <span className="font-semibold text-emerald-400">button_click</span>
          <span className="text-xs text-neutral-400 ml-auto">2023-11-15 14:32:07</span>
        </div>
        <div className="space-y-2">
          <div className="flex bg-neutral-800 p-2 rounded">
            <span className="text-neutral-400 text-sm w-28">button_id</span>
            <span className="text-white text-sm ml-2 font-medium">signup-cta</span>
          </div>
          <div className="flex bg-neutral-800 p-2 rounded">
            <span className="text-neutral-400 text-sm w-28">page_section</span>
            <span className="text-white text-sm ml-2 font-medium">hero</span>
          </div>
          <div className="flex bg-neutral-800 p-2 rounded">
            <span className="text-neutral-400 text-sm w-28">user_segment</span>
            <span className="text-white text-sm ml-2 font-medium">new_visitor</span>
          </div>
          <div className="flex bg-neutral-800 p-2 rounded">
            <span className="text-neutral-400 text-sm w-28">ab_test</span>
            <span className="text-white text-sm ml-2 font-medium">version-a</span>
          </div>
        </div>
      </div>
    </Card>
  );
}