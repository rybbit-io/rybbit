"use client";

import { Bookmark, Fingerprint, Pencil, Plus } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { UserInfo } from "../../../../../api/analytics/endpoints";
import { useUserSegments } from "../../../../../api/analytics/hooks/useUserProfile";
import { ChannelIcon, extractDomain, getDisplayName } from "../../../../../components/Channel";
import { EditTraitsDialog } from "../../../../../components/EditTraitsDialog";
import { Favicon } from "../../../../../components/Favicon";
import { Button } from "../../../../../components/ui/button";
import { Card } from "../../../../../components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { useDateTimeFormat } from "../../../../../hooks/useDateTimeFormat";
import { useCanOnSite } from "../../../../../hooks/usePermissions";
import { useConfigs } from "../../../../../lib/configs";
import { canPivot } from "../../../../../lib/pivots";
import { useTimezone } from "../../../../../lib/store";
import { PerformanceMetric } from "../../../performance/performanceStore";
import {
  formatMetricValue,
  getMetricColor,
  getMetricUnit,
  METRIC_LABELS,
  METRIC_LABELS_SHORT,
} from "../../../performance/utils/performanceUtils";
import { LocationDevices } from "./LocationDevices";
import { useProfileHref, userFilter } from "./profileLinks";
import { InfoRow, InfoRowSkeleton, SidebarHeader, SidebarHint, SidebarSection } from "./SidebarPrimitives";
import { UserLocationMap } from "./UserLocationMap";
import { customTraits, traitLabel, traitText } from "./userTraits";

interface UserSidebarProps {
  /** The identity the profile's panels query: the identified id when there is one. */
  userId: string;
  data: UserInfo | undefined;
  isLoading: boolean;
  /**
   * The user's first day on the site, read on its own so first-touch facts do
   * not move with the date range. Undefined while it loads, and for a user the
   * page's filters leave with no sessions at all.
   */
  firstTouch: UserInfo | undefined;
  isLoadingFirstTouch: boolean;
  getRegionName: (region: string) => string;
}

const VITALS_ORDER: PerformanceMetric[] = ["lcp", "cls", "inp", "fcp", "ttfb"];

// Postgres hands timestamps back as "2026-08-14 10:02:11.123"; an API in
// front of it may hand back ISO. Both are UTC.
const parseUtc = (value: string | undefined) => {
  if (!value) return null;
  const sql = DateTime.fromSQL(value, { zone: "utc" });
  const parsed = sql.isValid ? sql : DateTime.fromISO(value, { zone: "utc" });
  // Empty ranges come back as epoch-zero timestamps; treat them as absent
  return parsed.isValid && parsed.year > 1970 ? parsed : null;
};

/**
 * The rail: everything the page knows about who this is, as one ledger.
 * Traits lead because they are what the site itself said about the person;
 * what Rybbit observed follows.
 */
export function UserSidebar({
  userId,
  data,
  isLoading,
  firstTouch,
  isLoadingFirstTouch,
  getRegionName,
}: UserSidebarProps) {
  const t = useExtracted();
  const zone = useTimezone();
  const { configs } = useConfigs();
  const { formatDateTime, formatRelative } = useDateTimeFormat();
  const profileHref = useProfileHref();
  const canEditTraits = useCanOnSite("users:write");
  const [traitsOpen, setTraitsOpen] = useState(false);
  const { data: segmentData } = useUserSegments(userId);

  const isIdentified = !!data?.identified_user_id;
  const traits = customTraits(data?.traits);
  const showTraits = isIdentified && !!data && (traits.length > 0 || canEditTraits);

  const segments = segmentData?.segments ?? [];

  // First-touch facts come from the user's first day; the selected period's
  // own first session stands in only when there is no first day to read.
  const acquisition = firstTouch ?? data;
  const isLoadingAcquisition = isLoading || isLoadingFirstTouch;
  const firstReferrerDomain = acquisition?.first_referrer ? extractDomain(acquisition.first_referrer) : null;
  const latestChannel = data?.last_channel;
  const channelChanged = !!latestChannel && !!acquisition && latestChannel !== acquisition.first_channel;
  const firstSeen = parseUtc(firstTouch?.first_seen)?.setZone(zone) ?? null;

  const vitals = data?.vitals ?? null;
  const vitalsToShow = vitals ? VITALS_ORDER.filter(metric => vitals[`${metric}_p75`] != null) : [];
  const showMap = !!configs?.mapboxToken && !!data?.country;
  const linkedDevices = isIdentified ? (data?.linked_devices ?? []) : [];

  const truncated = (value: string) => (
    <span className="inline-block max-w-[170px] truncate align-bottom" title={value}>
      {value}
    </span>
  );

  return (
    <Card className="w-full self-start lg:w-[300px] lg:shrink-0">
      <div className="divide-y divide-neutral-100 dark:divide-neutral-850">
        {/* Traits (identified users only) */}
        {showTraits && (
          <SidebarSection>
            <SidebarHeader
              title={t("Traits")}
              right={
                canEditTraits ? (
                  <Button
                    variant="ghost"
                    size="smIcon"
                    className="-my-1.5 -mr-1.5 h-6 w-6 text-neutral-500 dark:text-neutral-400"
                    aria-label={t("Edit traits")}
                    onClick={() => setTraitsOpen(true)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                ) : undefined
              }
            />
            {traits.length > 0 ? (
              <div>
                {traits.map(([key, value]) => (
                  <InfoRow
                    key={key}
                    label={<span className="capitalize">{traitLabel(key)}</span>}
                    value={truncated(traitText(value))}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{t("No traits yet")}</p>
            )}
            {canEditTraits && (
              <button
                type="button"
                onClick={() => setTraitsOpen(true)}
                className="mt-1.5 inline-flex items-center gap-1 rounded-sm text-xs text-neutral-500 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                <Plus className="h-3 w-3" />
                {t("Add trait")}
              </button>
            )}
            <EditTraitsDialog
              userId={data.identified_user_id}
              traits={data.traits}
              open={traitsOpen}
              onOpenChange={setTraitsOpen}
            />
          </SidebarSection>
        )}

        {/* Saved segments this user's sessions fall into */}
        {segments.length > 0 && segmentData && (
          <SidebarSection>
            <SidebarHeader title={t("Segments")} right={<SidebarHint>{t("Sessions in range")}</SidebarHint>} />
            <div>
              {segments.map(segment => {
                const filters = [...segment.filters, userFilter(userId)];
                const name = (
                  <>
                    <Bookmark className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                    <span className="truncate">{segment.name}</span>
                  </>
                );
                return (
                  <InfoRow
                    key={segment.segmentId}
                    label={
                      // Offered only when the Sessions list honours every one of the segment's filters.
                      canPivot("sessions", filters) ? (
                        <Link
                          href={profileHref("sessions", filters)}
                          prefetch={false}
                          title={t("Open these sessions")}
                          className="inline-flex max-w-[170px] items-center gap-1.5 rounded-sm text-neutral-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:text-neutral-200"
                        >
                          {name}
                        </Link>
                      ) : (
                        <span className="inline-flex max-w-[170px] items-center gap-1.5 text-neutral-700 dark:text-neutral-200">
                          {name}
                        </span>
                      )
                    }
                    value={
                      <>
                        <span className="tabular-nums">{segment.sessions.toLocaleString()}</span>
                        <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                          {t("of {total}", { total: segmentData.total_sessions.toLocaleString() })}
                        </span>
                      </>
                    }
                  />
                );
              })}
            </div>
            {segmentData.truncated && (
              <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                {t("Only the first segments by name are checked.")}
              </p>
            )}
          </SidebarSection>
        )}

        {/* Acquisition (first-touch attribution) */}
        <SidebarSection>
          <SidebarHeader title={t("Acquisition")} right={<SidebarHint>{t("First touch")}</SidebarHint>} />
          {isLoadingAcquisition ? (
            <div>
              <InfoRowSkeleton labelWidth="w-14" valueWidth="w-24" withIcon />
              <InfoRowSkeleton labelWidth="w-12" valueWidth="w-20" withIcon />
              <InfoRowSkeleton labelWidth="w-16" valueWidth="w-28" />
              <InfoRowSkeleton labelWidth="w-14" valueWidth="w-32" />
            </div>
          ) : (
            <div>
              <InfoRow
                icon={
                  acquisition?.first_channel ? (
                    <ChannelIcon channel={acquisition.first_channel} className="w-3.5 h-3.5" />
                  ) : undefined
                }
                label={t("Channel")}
                value={acquisition?.first_channel || "—"}
              />
              <InfoRow
                icon={
                  firstReferrerDomain ? <Favicon domain={firstReferrerDomain} className="w-3.5 h-3.5" /> : undefined
                }
                label={t("Referrer")}
                value={firstReferrerDomain ? getDisplayName(firstReferrerDomain) : "—"}
              />
              <InfoRow
                label={t("Landing page")}
                value={acquisition?.first_entry_page ? truncated(acquisition.first_entry_page) : "—"}
              />
              {acquisition?.first_utm_source && (
                <InfoRow label={t("Source")} value={truncated(acquisition.first_utm_source)} />
              )}
              {acquisition?.first_utm_medium && (
                <InfoRow label={t("Medium")} value={truncated(acquisition.first_utm_medium)} />
              )}
              {acquisition?.first_utm_campaign && (
                <InfoRow label={t("Campaign")} value={truncated(acquisition.first_utm_campaign)} />
              )}
              {channelChanged && (
                <InfoRow
                  icon={<ChannelIcon channel={latestChannel} className="w-3.5 h-3.5" />}
                  label={t("Latest channel")}
                  value={latestChannel}
                />
              )}
              {firstSeen && (
                <InfoRow
                  label={t("First seen")}
                  value={
                    <span
                      className="whitespace-nowrap"
                      title={formatDateTime(firstSeen, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: zone,
                      })}
                    >
                      {formatDateTime(firstSeen, { year: "numeric", month: "short", day: "numeric", timeZone: zone })}
                      <span className="text-neutral-500 dark:text-neutral-400"> · {formatRelative(firstSeen)}</span>
                    </span>
                  }
                />
              )}
            </div>
          )}
        </SidebarSection>

        {/* Location & device */}
        <SidebarSection>
          <SidebarHeader title={t("Location & device")} />
          {showMap && data && !isLoading && (
            <UserLocationMap
              country={data.country}
              region={getRegionName(data.region)}
              city={data.city}
              className="mb-3 h-[132px]"
            />
          )}
          <LocationDevices data={data} isLoading={isLoading} getRegionName={getRegionName} />
        </SidebarSection>

        {/* Devices that were merged into this identity. The API has always
            returned them; the page never drew them. */}
        {linkedDevices.length > 0 && (
          <SidebarSection>
            <SidebarHeader
              title={t("Linked devices")}
              right={<SidebarHint>{linkedDevices.length.toLocaleString()}</SidebarHint>}
            />
            <div>
              {linkedDevices.map(device => {
                const linkedAt = parseUtc(device.created_at)?.setZone(zone) ?? null;
                return (
                  <InfoRow
                    key={device.anonymous_id}
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <Fingerprint className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                        <span
                          className="inline-block max-w-[110px] truncate font-mono text-neutral-700 dark:text-neutral-200"
                          title={device.anonymous_id}
                        >
                          {device.anonymous_id}
                        </span>
                      </span>
                    }
                    value={
                      linkedAt ? (
                        <span
                          className="whitespace-nowrap text-neutral-500 dark:text-neutral-400"
                          title={formatDateTime(linkedAt, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            timeZone: zone,
                          })}
                        >
                          {t("linked {date}", {
                            date: formatDateTime(linkedAt, {
                              month: "short",
                              day: "numeric",
                              year: linkedAt.year === DateTime.now().year ? undefined : "numeric",
                              timeZone: zone,
                            }),
                          })}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                );
              })}
            </div>
          </SidebarSection>
        )}

        {/* Web vitals (p75 across this user's performance events) */}
        {vitals && vitalsToShow.length > 0 && (
          <SidebarSection>
            <SidebarHeader title={t("Web vitals")} right={<SidebarHint>p75</SidebarHint>} />
            <div>
              {vitalsToShow.map(metric => {
                const value = vitals[`${metric}_p75`] as number;
                return (
                  <InfoRow
                    key={metric}
                    label={
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">{METRIC_LABELS_SHORT[metric]}</span>
                        </TooltipTrigger>
                        <TooltipContent>{METRIC_LABELS[metric]}</TooltipContent>
                      </Tooltip>
                    }
                    value={
                      <span className={`tabular-nums ${getMetricColor(metric, value)}`}>
                        {formatMetricValue(metric, value)}
                        {getMetricUnit(metric, value)}
                      </span>
                    }
                  />
                );
              })}
            </div>
          </SidebarSection>
        )}
      </div>
    </Card>
  );
}
