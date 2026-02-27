import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getTimezone } from "@/lib/store";
import { Clock } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";

import { useExtracted } from "next-intl";
import { SessionEvent } from "../../../api/analytics/endpoints";
import { getEventDisplayName, PROPS_TO_HIDE } from "../../../lib/events";
import { useDateTimeFormat } from "../../../hooks/useDateTimeFormat";
import { formatDuration } from "../../../lib/dateTimeUtils";
import { cn } from "../../../lib/utils";
import { EventTypeIcon } from "../../EventIcons";

function PropBadge({ label, value }: { label: string; value: unknown }) {
  const display =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return (
    <Badge variant="outline">
      <span className="text-neutral-600 dark:text-neutral-300 font-light mr-1">
        {label}:
      </span>{" "}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="truncate">{display}</span>
        </TooltipTrigger>
        <TooltipContent>
          <span className="max-w-7xl">{display}</span>
        </TooltipContent>
      </Tooltip>
    </Badge>
  );
}

function DetailsRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center pl-7 mt-1">
      <div className="text-xs text-neutral-500 dark:text-neutral-400">
        {children}
      </div>
    </div>
  );
}

function renderDetails(
  item: SessionEvent,
  flags: {
    isPageview: boolean;
    isOutbound: boolean;
    isEvent: boolean;
    isError: boolean;
    isButtonClick: boolean;
    isCopy: boolean;
    isFormSubmit: boolean;
    isInputChange: boolean;
    duration: string | null;
  },
  t: (key: string) => string
) {
  const {
    isPageview,
    isOutbound,
    isEvent,
    isError,
    isButtonClick,
    isCopy,
    isFormSubmit,
    isInputChange,
    duration,
  } = flags;

  if (isPageview && duration) {
    return (
      <DetailsRow>
        <Clock className="w-3 h-3 inline mr-1 text-neutral-500 dark:text-neutral-400" />
        {duration}
      </DetailsRow>
    );
  }

  if (isEvent && item.props && Object.keys(item.props).length > 0) {
    return (
      <DetailsRow>
        <span className="flex flex-wrap gap-2 mt-1">
          {Object.entries(item.props).map(([key, value]) => (
            <PropBadge key={key} label={key} value={value} />
          ))}
        </span>
      </DetailsRow>
    );
  }

  if (isOutbound && item.props && Object.keys(item.props).length > 0) {
    return (
      <DetailsRow>
        <span className="flex flex-wrap gap-2 mt-1">
          {item.props.text ? (
            <PropBadge label="text" value={item.props.text} />
          ) : null}
          {item.props.target ? (
            <PropBadge label="target" value={item.props.target} />
          ) : null}
        </span>
      </DetailsRow>
    );
  }

  if (isError && item.props) {
    return (
      <DetailsRow>
        <span>
          {item.props.message && (
            <PropBadge label="message" value={item.props.message} />
          )}
          {item.props.stack && (
            <div>
              <p className="mt-2 mb-1 text-neutral-600 dark:text-neutral-300 font-light">
                {t("Stack Trace:")}
              </p>
              <pre className="text-xs text-neutral-900 dark:text-neutral-100 bg-neutral-200 dark:bg-neutral-800 p-2 rounded overflow-x-auto whitespace-pre-wrap wrap-break-word">
                {item.props.stack}
              </pre>
            </div>
          )}
        </span>
      </DetailsRow>
    );
  }

  if (isButtonClick || isCopy || isFormSubmit || isInputChange) {
    const propsToHide = PROPS_TO_HIDE[item.type] || [];
    const remainingProps = item.props
      ? Object.entries(item.props).filter(
        ([key]) => !propsToHide.includes(key)
      )
      : [];

    if (remainingProps.length === 0) return null;

    return (
      <DetailsRow>
        <span className="flex flex-wrap gap-2 mt-1">
          {remainingProps.map(([key, value]) => (
            <PropBadge key={key} label={key} value={value} />
          ))}
        </span>
      </DetailsRow>
    );
  }

  return null;
}

interface PageviewItemProps {
  item: SessionEvent;
  index: number;
  isLast?: boolean;
  nextTimestamp?: string;
  showHostname?: boolean;
  highlightedEventTimestamp?: number;
}

export function PageviewItem({
  item,
  index,
  isLast = false,
  nextTimestamp,
  showHostname = true,
  highlightedEventTimestamp,
}: PageviewItemProps) {
  const t = useExtracted();
  const { hour12 } = useDateTimeFormat();
  const isPageview = item.type === "pageview";
  const isOutbound = item.type === "outbound";
  const isEvent = item.type === "custom_event";
  const isError = item.type === "error";
  const isButtonClick = item.type === "button_click";
  const isCopy = item.type === "copy";
  const isFormSubmit = item.type === "form_submit";
  const isInputChange = item.type === "input_change";
  const timestamp = DateTime.fromSQL(item.timestamp, { zone: "utc" }).setZone(
    getTimezone()
  );
  const formattedTime = timestamp.toFormat(hour12 ? "h:mm:ss a" : "HH:mm:ss");
  const isHighlightedEvent = highlightedEventTimestamp === DateTime.fromSQL(item.timestamp, { zone: "utc" }).toMillis();

  // Calculate duration if this is a pageview and we have the next timestamp
  let duration = null;
  if (isPageview && nextTimestamp) {
    const nextTime = DateTime.fromSQL(nextTimestamp, { zone: "utc" }).setZone(
      getTimezone()
    );
    const totalSeconds = Math.floor(nextTime.diff(timestamp).milliseconds / 1000);
    duration = formatDuration(totalSeconds);
  }

  return (
    <div className="flex mb-3">
      {/* Timeline circle with number */}
      <div className="relative shrink-0">
        {!isLast && (
          <div
            className="absolute top-8 left-4 w-px bg-neutral-200 dark:bg-neutral-600/25"
            style={{
              height: "calc(100% - 20px)",
            }}
          />
        )}
        {/* Connecting line */}
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full border",
            "bg-neutral-50 border-neutral-200 dark:bg-neutral-600/10 dark:border-neutral-600/25",
            isHighlightedEvent && "bg-accent-400 border-accent-300 dark:bg-accent-600 dark:border-accent-500"
          )}
        >
          <span className="text-sm font-medium">{index + 1}</span>
        </div>
      </div>

      <div className="flex flex-col ml-3 flex-1">
        <div className="flex items-center flex-1 py-1">
          <div className="shrink-0 mr-3">
            <EventTypeIcon type={item.type} />
          </div>

          <div className="flex-1 min-w-0 mr-4">
            {isPageview ? (
              <Link
                href={`https://${item.hostname}${item.pathname}${item.querystring ? `${item.querystring}` : ""}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div
                  className="text-sm truncate hover:underline "
                  title={item.pathname}
                  style={{
                    maxWidth: "calc(min(100vw, 1150px) - 250px)",
                  }}
                >
                  {showHostname && item.hostname}
                  {item.pathname}
                  {item.querystring && (
                    <span className="text-neutral-400 dark:text-neutral-500">
                      {item.querystring}
                    </span>
                  )}
                </div>
              </Link>
            ) : isOutbound && item.props?.url ? (
              <Link
                href={String(item.props.url)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div
                  className="text-sm truncate hover:underline"
                  title={String(item.props.url)}
                  style={{
                    maxWidth: "calc(min(100vw, 1150px) - 250px)",
                  }}
                >
                  {String(item.props.url)}
                </div>
              </Link>
            ) : (
              <div className="text-sm truncate">{getEventDisplayName(item, t)}</div>
            )}
          </div>

          <div className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
            {formattedTime}
          </div>
        </div>
        {renderDetails(item, {
          isPageview,
          isOutbound,
          isEvent,
          isError,
          isButtonClick,
          isCopy,
          isFormSubmit,
          isInputChange,
          duration,
        }, t)}
      </div>
    </div>
  );
}
