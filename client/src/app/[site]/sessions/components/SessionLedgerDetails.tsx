"use client";

import { ArrowRight, Video } from "lucide-react";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { ReactNode } from "react";
import { GetSessionsResponse } from "@/api/analytics/endpoints";
import { Avatar } from "@/components/Avatar";
import { ChannelIcon, extractDomain } from "@/components/Channel";
import { IdentifiedBadge } from "@/components/IdentifiedBadge";
import { CopyButton } from "@/components/interior/copy-button";
import { sessionEventCount } from "@/components/Sessions/sessionEventCount";
import { Button } from "@/components/ui/button";
import { useGetRegionName } from "@/lib/geo";
import { getCountryName, getLanguageName, getUserDisplayName } from "@/lib/utils";
import { Browser } from "../../components/shared/icons/Browser";
import { CountryFlag } from "../../components/shared/icons/CountryFlag";
import { DeviceIcon } from "../../components/shared/icons/Device";
import { OperatingSystem } from "../../components/shared/icons/OperatingSystem";
import { SessionTimeline } from "./SessionTimeline";

type Session = GetSessionsResponse[number];

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <dt className="w-[4.5rem] shrink-0 pt-px text-xs text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-neutral-800 dark:text-neutral-200">
        {children}
      </dd>
    </div>
  );
}

const UTM_FIELDS = [
  ["source", "utm_source"],
  ["medium", "utm_medium"],
  ["campaign", "utm_campaign"],
  ["term", "utm_term"],
  ["content", "utm_content"],
] as const;

function SessionFacts({
  session,
  userHref,
  onWatchReplay,
}: {
  session: Session;
  userHref: string;
  onWatchReplay?: () => void;
}) {
  const t = useExtracted();
  const { getRegionName } = useGetRegionName();

  const location = [session.city, getRegionName(session.region), session.country && getCountryName(session.country)]
    .filter(Boolean)
    .join(", ");
  const referrerDomain = extractDomain(session.referrer);
  const utm = UTM_FIELDS.filter(([, field]) => session[field]);
  const muted = "text-neutral-500 dark:text-neutral-400";

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t("Session facts")}</h3>
        <div className={`flex min-w-0 items-center gap-0.5 text-xs tabular-nums ${muted}`}>
          <span className="truncate" title={session.session_id}>
            {session.session_id.slice(0, 8)}
          </span>
          <CopyButton
            iconOnly
            tooltip
            size="xs"
            variant="ghost"
            value={session.session_id}
            label={t("Copy session ID")}
          />
        </div>
      </div>

      <dl className="mt-1.5">
        <Fact label={t("User")}>
          <Avatar size={16} id={session.user_id} />
          <Link href={userHref} className="truncate hover:underline">
            {getUserDisplayName(session)}
          </Link>
          {!!session.identified_user_id && (
            <IdentifiedBadge traits={session.traits} userId={session.identified_user_id} className="px-1 py-px" />
          )}
        </Fact>
        {location && (
          <Fact label={t("Location")}>
            {session.country && <CountryFlag country={session.country} className="w-4 shrink-0" />}
            <span className="min-w-0 break-words">{location}</span>
          </Fact>
        )}
        <Fact label={t("Device")}>
          <span className={`shrink-0 ${muted}`}>
            <DeviceIcon deviceType={session.device_type} size={14} />
          </span>
          <span>{session.device_type || t("Unknown")}</span>
          {!!session.screen_width && !!session.screen_height && (
            <span className={`tabular-nums ${muted}`}>
              {session.screen_width} × {session.screen_height}
            </span>
          )}
        </Fact>
        <Fact label={t("Browser")}>
          <Browser browser={session.browser || "Unknown"} size={14} />
          <span>{[session.browser || t("Unknown"), session.browser_version].filter(Boolean).join(" ")}</span>
          {session.operating_system && (
            <>
              <span className="ml-1 flex shrink-0">
                <OperatingSystem os={session.operating_system} size={14} />
              </span>
              <span>{[session.operating_system, session.operating_system_version].filter(Boolean).join(" ")}</span>
            </>
          )}
        </Fact>
        <Fact label={t("Source")}>
          <ChannelIcon channel={session.channel} className={`h-3.5 w-3.5 shrink-0 ${muted}`} />
          <span>{session.channel || t("Unknown")}</span>
          {referrerDomain && (
            <span className={`min-w-0 truncate ${muted}`} title={session.referrer}>
              {referrerDomain}
            </span>
          )}
        </Fact>
        {utm.length > 0 && (
          <Fact label={t("Campaign")}>
            {utm.map(([name, field]) => (
              <span
                key={field}
                title={`utm_${name}: ${session[field]}`}
                className="inline-flex max-w-full items-center rounded-md border border-neutral-150 px-1.5 py-0.5 text-xs dark:border-neutral-800"
              >
                <span className={`mr-1 shrink-0 ${muted}`}>{name}</span>
                <span className="truncate font-medium">{session[field]}</span>
              </span>
            ))}
          </Fact>
        )}
        {session.language && <Fact label={t("Language")}>{getLanguageName(session.language)}</Fact>}
        {session.ip && (
          <Fact label={t("IP")}>
            <span className="tabular-nums">{session.ip}</span>
          </Fact>
        )}
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {onWatchReplay && (
          <Button type="button" variant="success" size="sm" className="gap-1.5" onClick={onWatchReplay}>
            <Video />
            {t("Watch replay")}
          </Button>
        )}
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={userHref}>
            {t("View user")}
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}

interface SessionLedgerDetailsProps {
  session: Session;
  userHref: string;
  /** Opens the replay; left out when the session has none. */
  onWatchReplay?: () => void;
}

/**
 * An open ledger row: the session's timeline beside its facts. They used to
 * be two tabs, so reading where someone came from meant leaving what they did.
 */
export function SessionLedgerDetails({ session, userHref, onWatchReplay }: SessionLedgerDetailsProps) {
  return (
    // Side by side once the ledger (the container) has the width; stacked before that.
    <div className="grid border-b border-neutral-100 bg-neutral-50 @min-[900px]:grid-cols-[minmax(0,1fr)_316px] dark:border-neutral-800 dark:bg-background">
      <div className="min-w-0 px-3 py-3 @min-[800px]:pl-[38px] @min-[800px]:pr-4">
        <SessionTimeline
          sessionId={session.session_id}
          expectedEvents={session.pageviews + sessionEventCount(session) + (session.errors || 0)}
        />
      </div>
      <div className="border-t border-neutral-100 px-3 py-3 @min-[800px]:px-4 @min-[900px]:border-l @min-[900px]:border-t-0 dark:border-neutral-800">
        <SessionFacts session={session} userHref={userHref} onWatchReplay={onWatchReplay} />
      </div>
    </div>
  );
}
