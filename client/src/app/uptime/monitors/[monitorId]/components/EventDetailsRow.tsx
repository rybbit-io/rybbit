"use client";

import { cn } from "@/lib/utils";
import { MonitorEvent } from "@/api/uptime/monitors";
import { TimingWaterfall } from "./TimingWaterfall";

interface EventDetailsRowProps {
  event: MonitorEvent;
}

export function EventDetailsRow({ event }: EventDetailsRowProps) {
  return (
    <div className="bg-neutral-900 border-t border-neutral-800 p-6">
      <div className="space-y-6">
        {/* Timing Waterfall */}
        {event.monitor_type === "http" && (
          <div className="mb-6">
            <TimingWaterfall event={event} />
          </div>
        )}

        {/* Error Message */}
        {event.error_message && (
          <div>
            <h4 className="text-sm font-medium text-red-500 mb-2">Error Message</h4>
            <div className="text-sm text-neutral-400 bg-neutral-900 p-3 rounded whitespace-pre-wrap font-mono">
              {event.error_message}
            </div>
          </div>
        )}

        {/* Headers Table */}
        {event.response_headers && Object.keys(event.response_headers).length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Response Headers</h4>
            <div className="border border-neutral-800 rounded overflow-hidden">
              <table className="w-full text-xs">
                <tbody>
                  {Object.entries(event.response_headers).map(([key, value], index) => (
                    <tr
                      key={key}
                      className={cn(
                        "border-b border-neutral-800",
                        index === Object.keys(event.response_headers!).length - 1 && "border-b-0"
                      )}
                    >
                      <td className="px-4 py-2 text-neutral-400 font-mono w-1/3 bg-neutral-900/50">{key}</td>
                      <td className="px-4 py-2 text-neutral-200 font-mono break-all">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
