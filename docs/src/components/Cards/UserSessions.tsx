import { Eye, Laptop, MousePointerClick, Send, Users, Zap } from "lucide-react";
import { useExtracted } from "next-intl";
import { Avatar } from "../Avatar";
import { Browser } from "../Browser";
import { CountryFlag } from "../Country";
import { OperatingSystem } from "../OperatingSystem";
import { Card } from "./Card";
import { DemoFrame } from "./DemoFrame";

// One session timeline, in the product's event vocabulary. Identity is a
// salted visitor hash — Rybbit is cookieless and never knows a name.
const TIMELINE = [
  {
    icon: Eye,
    iconClassName: "text-blue-600 dark:text-blue-400",
    detail: "/home",
    time: "14:22:05",
    meta: "1m 32s",
  },
  {
    icon: MousePointerClick,
    iconClassName: "text-green-600 dark:text-green-400",
    detail: "button_click",
    time: "14:23:37",
    chips: [{ label: "text", value: "Start free trial" }],
  },
  {
    icon: Eye,
    iconClassName: "text-blue-600 dark:text-blue-400",
    detail: "/pricing",
    time: "14:23:40",
    meta: "4m 42s",
  },
  {
    icon: Send,
    iconClassName: "text-purple-600 dark:text-purple-400",
    detail: "form_submit",
    time: "14:28:22",
    chips: [
      { label: "formId", value: "signup" },
      { label: "success", value: "true" },
    ],
  },
  {
    icon: Zap,
    iconClassName: "text-amber-600 dark:text-amber-400",
    detail: "purchase",
    time: "14:35:48",
    chips: [{ label: "plan", value: "pro" }],
  },
];

export function UserSessions() {
  const t = useExtracted();
  return (
    <Card
      title={t("User Sessions")}
      description={t("Track complete user journeys through your site with detailed session timelines.")}
      icon={Users}
    >
      <DemoFrame label="sessions" right={<span className="font-mono">14:22 – 14:36 · 14m</span>}>
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Avatar size={28} id="4f2a91" />
              <div>
                <div className="font-mono text-sm text-neutral-900 dark:text-neutral-100">visitor 4f2a91</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t("{pageviews} pageviews · {events} events", { pageviews: "2", events: "3" })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <CountryFlag country="US" />
              <Browser browser="Chrome" />
              <OperatingSystem os="macOS" />
              <Laptop className="size-4" aria-hidden="true" />
            </div>
          </div>

          <div>
            {TIMELINE.map((event, index) => {
              const Icon = event.icon;
              const isLast = index === TIMELINE.length - 1;
              return (
                <div key={event.time} className="flex gap-2.5 pb-1">
                  <div className="relative flex shrink-0 flex-col items-center">
                    <div className="flex size-6 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-700 dark:border-neutral-700/60 dark:bg-neutral-800/50 dark:text-neutral-300">
                      {index + 1}
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-neutral-200 dark:bg-neutral-800" />}
                  </div>

                  <div className="min-w-0 flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={`shrink-0 ${event.iconClassName}`} aria-hidden="true" />
                      <span className="truncate font-mono text-xs text-neutral-800 dark:text-neutral-200">
                        {event.detail}
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                        {event.time}
                      </span>
                    </div>
                    {event.meta && (
                      <div className="mt-1 pl-[22px] text-xs text-neutral-500 dark:text-neutral-400">{event.meta}</div>
                    )}
                    {event.chips && (
                      <div className="mt-1 flex flex-wrap gap-1.5 pl-[22px]">
                        {event.chips.map(chip => (
                          <span
                            key={chip.label}
                            className="rounded border border-neutral-200 bg-neutral-50 px-1.5 font-mono text-xs leading-5 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                          >
                            <span className="text-neutral-500 dark:text-neutral-500">{chip.label}: </span>
                            {chip.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DemoFrame>
    </Card>
  );
}
