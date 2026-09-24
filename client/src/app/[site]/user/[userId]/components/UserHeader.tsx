"use client";

import { Check, Clock, Copy } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted, useLocale } from "next-intl";
import { useRef, useState } from "react";
import { UserInfo } from "../../../../../api/analytics/endpoints";
import { Avatar } from "../../../../../components/Avatar";
import { IdentifiedBadge } from "../../../../../components/IdentifiedBadge";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { useDateTimeFormat } from "../../../../../hooks/useDateTimeFormat";
import { getTimezone } from "../../../../../lib/store";
import { userStore } from "../../../../../lib/userStore";
import { UserActions } from "./UserActions";

// Considered "online" when the latest event is under five minutes old — the
// same window the session avatars use for their presence dot.
const ONLINE_WINDOW_SECONDS = 300;

function CopyUserId({ value }: { value: string }) {
  const t = useExtracted();
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (permissions/insecure context); leave the id selectable
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-w-0 items-center gap-1 rounded-sm font-mono text-neutral-500 transition-colors hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <span className="max-w-[160px] truncate sm:max-w-[260px]">{value}</span>
          {copied ? (
            <Check className="h-3 w-3 shrink-0 text-emerald-500" />
          ) : (
            <Copy className="h-3 w-3 shrink-0 text-neutral-400 dark:text-neutral-500" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{copied ? t("Copied!") : t("Copy user ID")}</TooltipContent>
    </Tooltip>
  );
}

interface UserHeaderProps {
  userId: string;
  displayName: string;
  data: UserInfo | undefined;
  isLoading: boolean;
}

export function UserHeader({ userId, displayName, data, isLoading }: UserHeaderProps) {
  const t = useExtracted();
  const locale = useLocale();
  const { user } = userStore();
  const { formatRelative, formatDateTime, hour12 } = useDateTimeFormat();

  const isIdentified = !!data?.identified_user_id;
  const traitsEmail = data?.traits?.email as string | undefined;

  // The user's clock, from the timezone captured on their latest event
  const localTime = data?.timezone ? DateTime.now().setZone(data.timezone) : null;
  const localTimeValid = localTime?.isValid ? localTime : null;
  const timezoneCity = data?.timezone?.split("/").pop()?.replace(/_/g, " ");

  const lastSeen = data?.last_seen ? DateTime.fromSQL(data.last_seen, { zone: "utc" }) : null;
  // Empty ranges come back as epoch-zero timestamps; treat them as absent
  const lastSeenValid = lastSeen?.isValid && lastSeen.year > 1970 ? lastSeen.setZone(getTimezone()) : null;
  const isOnline = !!lastSeenValid && -lastSeenValid.diffNow().as("seconds") < ONLINE_WINDOW_SECONDS;

  return (
    <header className="mb-4 mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 items-center gap-3.5">
        <Avatar size={52} id={userId} />
        <div className="min-w-0">
          {isLoading ? (
            <>
              <Skeleton className="h-6 w-44 rounded" />
              <Skeleton className="mt-1.5 h-3.5 w-64 rounded" />
            </>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-lg font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
                  {displayName}
                </h1>
                {isIdentified && <IdentifiedBadge traits={data?.traits} userId={data?.identified_user_id} />}
              </div>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                {isOnline ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    {t("Online")}
                  </span>
                ) : (
                  lastSeenValid && (
                    <span
                      title={formatDateTime(lastSeenValid, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12,
                        timeZone: getTimezone(),
                      })}
                    >
                      {t("Active {time}", { time: formatRelative(lastSeenValid) })}
                    </span>
                  )
                )}
                {traitsEmail && (
                  <span className="min-w-0 max-w-[240px] truncate" title={traitsEmail}>
                    {traitsEmail}
                  </span>
                )}
                <CopyUserId value={userId} />
                {localTimeValid && (
                  <span
                    className="inline-flex items-center gap-1 whitespace-nowrap"
                    title={`${t("Local time")} · ${data?.timezone}`}
                  >
                    <Clock className="h-3 w-3 text-neutral-400 dark:text-neutral-500" />
                    {localTimeValid.setLocale(locale).toLocaleString(DateTime.TIME_SIMPLE)}
                    {timezoneCity && <span className="text-neutral-400 dark:text-neutral-500">{timezoneCity}</span>}
                  </span>
                )}
                {data?.ip && (
                  <span className="whitespace-nowrap font-mono" title={t("IP address")}>
                    {data.ip}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {user && data && (
        <div className="shrink-0">
          <UserActions userId={userId} data={data} />
        </div>
      )}
    </header>
  );
}
