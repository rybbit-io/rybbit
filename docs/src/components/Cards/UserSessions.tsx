import { Clock, Eye, Laptop, MousePointerClick, Users } from "lucide-react";
import { useExtracted } from "next-intl";
import { Browser } from "../Browser";
import { CountryFlag } from "../Country";
import { OperatingSystem } from "../OperatingSystem";
import { Card } from "./Card";
import { Avatar } from "../Avatar";

export function UserSessions() {
  const t = useExtracted();
  return (
    <Card
      title={t("User Sessions")}
      description={t("Track complete user journeys through your site with detailed session timelines.")}
      icon={Users}
    >
      <div className="space-y-4 mt-4 transform rotate-2 translate-x-8 translate-y-6  bg-neutral-100/50 dark:bg-neutral-800/20 border border-neutral-300/50 dark:border-neutral-800/50 pb-20 rounded-lg p-4 -mb-[100px] transition-transform duration-300 hover:scale-105 hover:rotate-3">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Avatar size={28} id="john-doe" />
            <div>
              <div className="text-sm">John Doe</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Today, 14:22 - 14:36 (14m)</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
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
        <div className="px-1 py-1">
          {/* Event 1 */}
          <div className="flex mb-2">
            <div className="relative flex-shrink-0">
              <div className="absolute top-7 left-3.5 w-[1px] bg-neutral-200 dark:bg-neutral-700 h-[calc(100%-16px)]" />
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-neutral-50 border border-neutral-200 dark:bg-neutral-600/25 dark:border-neutral-600/25">
                <span className="text-xs font-medium">1</span>
              </div>
            </div>

            <div className="flex flex-col ml-2 flex-1">
              <div className="flex items-center flex-1 py-0.5">
                <Eye className="w-3.5 h-3.5 text-blue-400 mr-2" />
                <div className="flex-1 min-w-0 mr-3">
                  <div className="text-sm truncate">/home</div>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">14:22:05</div>
              </div>
              <div className="flex items-center pl-5 mt-0.5">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  <Clock className="w-3 h-3 inline mr-1" />
                  1m 32s
                </div>
              </div>
            </div>
          </div>
          {/* Event 2 */}
          <div className="flex mb-2">
            <div className="relative flex-shrink-0">
              <div className="absolute top-7 left-3.5 w-[1px] bg-neutral-300 dark:bg-neutral-700 h-[calc(100%-16px)]" />
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-neutral-50 border border-neutral-200 dark:bg-neutral-600/25 dark:border-neutral-600/25">
                <span className="text-xs font-medium">2</span>
              </div>
            </div>

            <div className="flex flex-col ml-2 flex-1">
              <div className="flex items-center flex-1 py-0.5">
                <MousePointerClick className="w-3.5 h-3.5 text-amber-400 mr-2" />
                <div className="flex-1 min-w-0 mr-3">
                  <div className="text-sm truncate">button_click</div>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">14:25:55</div>
              </div>
              <div className="flex items-center pl-5 mt-0.5">
                <div className="flex flex-wrap gap-1.5">
                  <div className="px-1.5 py-0 h-5 text-xs bg-neutral-200 dark:bg-neutral-800 rounded border border-neutral-400 dark:border-neutral-700">
                    <span className="text-neutral-500 dark:text-neutral-400 font-light mr-1">button_id:</span>
                    <span>pricing</span>
                  </div>
                  <div className="px-1.5 py-0 h-5 text-xs bg-neutral-200 dark:bg-neutral-800 rounded border border-neutral-400 dark:border-neutral-700">
                    <span className="text-neutral-500 dark:text-neutral-400 font-light mr-1">section:</span>
                    <span>features</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Event 3 */}
          <div className="flex mb-2">
            <div className="relative flex-shrink-0">
              <div className="absolute top-7 left-3.5 w-[1px] bg-neutral-300 dark:bg-neutral-700 h-[calc(100%-16px)]" />
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-neutral-50 border border-neutral-200 dark:bg-neutral-600/25 dark:border-neutral-600/25">
                <span className="text-xs font-medium">3</span>
              </div>
            </div>

            <div className="flex flex-col ml-2 flex-1">
              <div className="flex items-center flex-1 py-0.5">
                <Eye className="w-3.5 h-3.5 text-blue-400 mr-2" />
                <div className="flex-1 min-w-0 mr-3">
                  <div className="text-sm truncate">/pricing</div>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">14:25:58</div>
              </div>
              <div className="flex items-center pl-5 mt-0.5">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  <Clock className="w-3 h-3 inline mr-1" />
                  4m 42s
                </div>
              </div>
            </div>
          </div>

          {/* Event 4 */}
          <div className="flex mb-2">
            <div className="relative flex-shrink-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-neutral-50 border border-neutral-200 dark:bg-neutral-600/25 dark:border-neutral-600/25">
                <span className="text-xs font-medium">4</span>
              </div>
            </div>

            <div className="flex flex-col ml-2 flex-1">
              <div className="flex items-center flex-1 py-0.5">
                <MousePointerClick className="w-3.5 h-3.5 text-amber-400 mr-2" />
                <div className="flex-1 min-w-0 mr-3">
                  <div className="text-sm truncate">form_submit</div>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">14:30:40</div>
              </div>
              <div className="flex items-center pl-5 mt-0.5">
                <div className="flex flex-wrap gap-1.5">
                  <div className="px-1.5 py-0 h-5 text-xs bg-neutral-200 dark:bg-neutral-800 rounded border border-neutral-400 dark:border-neutral-700">
                    <span className="text-neutral-500 dark:text-neutral-400 font-light mr-1">form_id:</span>
                    <span>contact-form</span>
                  </div>
                  <div className="px-1.5 py-0 h-5 text-xs bg-neutral-200 dark:bg-neutral-800 rounded border border-neutral-400 dark:border-neutral-700">
                    <span className="text-neutral-500 dark:text-neutral-400 font-light mr-1">success:</span>
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
