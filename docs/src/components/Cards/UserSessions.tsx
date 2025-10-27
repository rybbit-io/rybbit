import Avatar from "boring-avatars";
import { Clock, Eye, Laptop, MousePointerClick } from "lucide-react";
import { Browser } from "../Browser";
import { CountryFlag } from "../Country";
import { OperatingSystem } from "../OperatingSystem";
import { Card } from "./Card";

export function UserSessions() {
  return (
    <Card
      title="User Sessions"
      description="Track complete user journeys through your site with detailed session timelines."
    >
      <div className="mt-4 bg-neutral-900 p-4 rounded-md">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Avatar
              size={32}
              name={"billy"}
              variant="marble"
              colors={["#226756", "#6eaaa3", "#e8e8e8", "#bbc1e2", "#7182d6"]}
            />
            <div>
              <div className="text-sm">2c49ae3</div>
              <div className="text-xs text-neutral-400">Today, 14:22 - 14:36 (14m)</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CountryFlag country="US" />
            <Browser browser="Chrome" />
            <OperatingSystem os="macOS" />
            <Laptop className="w-4 h-4" />
          </div>
        </div>
        {/*         
        <div className="flex gap-2 mb-3">
          <div className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
            <Eye className="w-3 h-3" />
            <span>Pageviews: 5</span>
          </div>
          <div className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">
            <MousePointerClick className="w-3 h-3" />
            <span>Events: 2</span>
          </div>
        </div> */}

        {/* Timeline */}
        <div className="px-1 py-2">
          {/* Event 1 */}
          <div className="flex mb-3">
            <div className="relative flex-shrink-0">
              <div className="absolute top-8 left-4 w-[1px] bg-neutral-700 h-[calc(100%-20px)]" />
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-900/30 border border-blue-500/50">
                <span className="text-sm font-medium">1</span>
              </div>
            </div>

            <div className="flex flex-col ml-3 flex-1">
              <div className="flex items-center flex-1 py-1">
                <Eye className="w-4 h-4 text-blue-500 mr-3" />
                <div className="flex-1 min-w-0 mr-4">
                  <div className="text-sm truncate">/home</div>
                </div>
                <div className="text-xs text-neutral-400">14:22:05</div>
              </div>
              <div className="flex items-center pl-7 mt-1">
                <div className="text-xs text-neutral-400">
                  <Clock className="w-3 h-3 inline mr-1" />
                  1m 32s
                </div>
              </div>
            </div>
          </div>
          {/* Event 2 */}
          <div className="flex mb-3">
            <div className="relative flex-shrink-0">
              <div className="absolute top-8 left-4 w-[1px] bg-neutral-700 h-[calc(100%-20px)]" />
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-900/30 border border-amber-500/50">
                <span className="text-sm font-medium">2</span>
              </div>
            </div>

            <div className="flex flex-col ml-3 flex-1">
              <div className="flex items-center flex-1 py-1">
                <MousePointerClick className="w-4 h-4 text-amber-500 mr-3" />
                <div className="flex-1 min-w-0 mr-4">
                  <div className="text-sm truncate">button_click</div>
                </div>
                <div className="text-xs text-neutral-400">14:25:55</div>
              </div>
              <div className="flex items-center pl-7 mt-1">
                <div className="flex flex-wrap gap-2">
                  <div className="px-1.5 py-0 h-5 text-xs bg-neutral-800 rounded border border-neutral-700">
                    <span className="text-neutral-400 font-light mr-1">button_id:</span>
                    <span>pricing</span>
                  </div>
                  <div className="px-1.5 py-0 h-5 text-xs bg-neutral-800 rounded border border-neutral-700">
                    <span className="text-neutral-400 font-light mr-1">section:</span>
                    <span>features</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Event 3 */}
          <div className="flex mb-3">
            <div className="relative flex-shrink-0">
              <div className="absolute top-8 left-4 w-[1px] bg-neutral-700 h-[calc(100%-20px)]" />
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-900/30 border border-blue-500/50">
                <span className="text-sm font-medium">3</span>
              </div>
            </div>

            <div className="flex flex-col ml-3 flex-1">
              <div className="flex items-center flex-1 py-1">
                <Eye className="w-4 h-4 text-blue-500 mr-3" />
                <div className="flex-1 min-w-0 mr-4">
                  <div className="text-sm truncate">/pricing</div>
                </div>
                <div className="text-xs text-neutral-400">14:25:58</div>
              </div>
              <div className="flex items-center pl-7 mt-1">
                <div className="text-xs text-neutral-400">
                  <Clock className="w-3 h-3 inline mr-1" />
                  4m 42s
                </div>
              </div>
            </div>
          </div>

          {/* Event 4 */}
          <div className="flex mb-3">
            <div className="relative flex-shrink-0">
              <div className="absolute top-8 left-4 w-[1px] bg-neutral-700 h-[calc(100%-20px)]" />
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-900/30 border border-amber-500/50">
                <span className="text-sm font-medium">4</span>
              </div>
            </div>

            <div className="flex flex-col ml-3 flex-1">
              <div className="flex items-center flex-1 py-1">
                <MousePointerClick className="w-4 h-4 text-amber-500 mr-3" />
                <div className="flex-1 min-w-0 mr-4">
                  <div className="text-sm truncate">form_submit</div>
                </div>
                <div className="text-xs text-neutral-400">14:30:40</div>
              </div>
              <div className="flex items-center pl-7 mt-1">
                <div className="flex flex-wrap gap-2">
                  <div className="px-1.5 py-0 h-5 text-xs bg-neutral-800 rounded border border-neutral-700">
                    <span className="text-neutral-400 font-light mr-1">form_id:</span>
                    <span>contact-form</span>
                  </div>
                  <div className="px-1.5 py-0 h-5 text-xs bg-neutral-800 rounded border border-neutral-700">
                    <span className="text-neutral-400 font-light mr-1">success:</span>
                    <span>true</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
