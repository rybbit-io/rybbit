"use client";

import { useExtracted } from "next-intl";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../../../components/ui/button";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { VisitCalendar } from "./Calendar";
import { UserInfo, UserSessionCountResponse } from "../../../../../api/analytics/endpoints";
import { ChannelIcon, extractDomain, getDisplayName } from "../../../../../components/Channel";
import { Favicon } from "../../../../../components/Favicon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../../components/ui/tooltip";
import { useConfigs } from "../../../../../lib/configs";
import { userStore } from "../../../../../lib/userStore";
import { PerformanceMetric } from "../../../performance/performanceStore";
import {
  formatMetricValue,
  getMetricColor,
  getMetricUnit,
  METRIC_LABELS,
  METRIC_LABELS_SHORT,
} from "../../../performance/utils/performanceUtils";
import { EditTraitsDialog } from "../../../../../components/EditTraitsDialog";
import { LocationDevices } from "./LocationDevices";
import { InfoRow, InfoRowSkeleton, SidebarCard, SidebarHeader } from "./SidebarPrimitives";
import { UserLocationMap } from "./UserLocationMap";

interface UserSidebarProps {
  data: UserInfo | undefined;
  isLoading: boolean;
  sessionCount: UserSessionCountResponse[];
  isLoadingCalendar: boolean;
  getRegionName: (region: string) => string;
}

const VITALS_ORDER: PerformanceMetric[] = ["lcp", "cls", "inp", "fcp", "ttfb"];

export function UserSidebar({ data, isLoading, sessionCount, isLoadingCalendar, getRegionName }: UserSidebarProps) {
  const t = useExtracted();
  const { configs } = useConfigs();
  const { user } = userStore();
  const [traitsOpen, setTraitsOpen] = useState(false);
  const isIdentified = !!data?.identified_user_id;

  // Filter custom traits (exclude username, name, email)
  const customTraits = data?.traits
    ? Object.entries(data.traits).filter(([key]) => !["username", "name", "email"].includes(key))
    : [];

  const firstReferrerDomain = data?.first_referrer ? extractDomain(data.first_referrer) : null;
  const channelChanged = !!data?.last_channel && data.last_channel !== data.first_channel;
  const vitals = data?.vitals ?? null;
  const vitalsToShow = vitals
    ? VITALS_ORDER.filter(metric => vitals[`${metric}_p75`] != null)
    : [];
  const showMap = !!configs?.mapboxToken && !!data?.country;

  return (
    <div className="w-full lg:w-[300px] lg:shrink-0 space-y-3">
      {/* Acquisition (first-touch attribution) */}
      <SidebarCard>
        <SidebarHeader title={t("Acquisition")} />
        {isLoading ? (
          <div>
            <InfoRowSkeleton labelWidth="w-14" valueWidth="w-24" withIcon />
            <InfoRowSkeleton labelWidth="w-12" valueWidth="w-20" withIcon />
            <InfoRowSkeleton labelWidth="w-16" valueWidth="w-28" />
          </div>
        ) : (
          <div>
            <InfoRow
              icon={data?.first_channel ? <ChannelIcon channel={data.first_channel} className="w-3.5 h-3.5" /> : undefined}
              label={t("Channel")}
              value={data?.first_channel || "—"}
            />
            <InfoRow
              icon={firstReferrerDomain ? <Favicon domain={firstReferrerDomain} className="w-3.5 h-3.5" /> : undefined}
              label={t("Referrer")}
              value={firstReferrerDomain ? getDisplayName(firstReferrerDomain) : "—"}
            />
            <InfoRow
              label={t("Landing page")}
              value={
                data?.first_entry_page ? (
                  <span className="truncate max-w-[160px] inline-block" title={data.first_entry_page}>
                    {data.first_entry_page}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            {data?.first_utm_source && (
              <InfoRow
                label={t("Source")}
                value={<span className="truncate max-w-[160px] inline-block">{data.first_utm_source}</span>}
              />
            )}
            {data?.first_utm_medium && (
              <InfoRow
                label={t("Medium")}
                value={<span className="truncate max-w-[160px] inline-block">{data.first_utm_medium}</span>}
              />
            )}
            {data?.first_utm_campaign && (
              <InfoRow
                label={t("Campaign")}
                value={<span className="truncate max-w-[160px] inline-block">{data.first_utm_campaign}</span>}
              />
            )}
            {channelChanged && (
              <InfoRow
                icon={<ChannelIcon channel={data.last_channel} className="w-3.5 h-3.5" />}
                label={t("Latest channel")}
                value={data.last_channel}
              />
            )}
          </div>
        )}
      </SidebarCard>

      {/* Location & Device Info */}
      <SidebarCard>
        <SidebarHeader title={t("Location & Device")} />
        {showMap && data && !isLoading && (
          <UserLocationMap
            country={data.country}
            region={data.region}
            city={data.city}
            className="mb-3 h-[132px]"
          />
        )}
        <LocationDevices data={data} isLoading={isLoading} getRegionName={getRegionName} />
      </SidebarCard>

      {/* Activity Calendar — always the user's full recent history, independent
          of the selected date range */}
      <SidebarCard>
        <SidebarHeader
          title={t("Activity Calendar")}
          right={
            <span className="text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              {t("Last 4 months")}
            </span>
          }
        />
        <div className="h-[140px]">
          {isLoadingCalendar ? (
            <Skeleton className="h-full w-full rounded-md" />
          ) : sessionCount.length > 0 ? (
            <VisitCalendar sessionCount={sessionCount} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-neutral-500 dark:text-neutral-400">
              {t("No visits in the last 4 months")}
            </div>
          )}
        </div>
      </SidebarCard>

      {/* Web Vitals (p75 across this user's performance events) */}
      {vitals && vitalsToShow.length > 0 && (
        <SidebarCard>
          <SidebarHeader
            title={t("Web Vitals")}
            right={
              <span className="text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">p75</span>
            }
          />
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
                    <span className={getMetricColor(metric, value)}>
                      {formatMetricValue(metric, value)}
                      {getMetricUnit(metric, value)}
                    </span>
                  }
                />
              );
            })}
          </div>
        </SidebarCard>
      )}

      {/* User Traits (identified users only) */}
      {isIdentified && data && (customTraits.length > 0 || !!user) && (
        <SidebarCard>
          <SidebarHeader
            title={t("User Traits")}
            right={
              user ? (
                <Button
                  variant="ghost"
                  size="smIcon"
                  className="-my-1.5 -mr-1.5 h-6 w-6 text-neutral-500"
                  aria-label={t("Edit Traits")}
                  onClick={() => setTraitsOpen(true)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              ) : undefined
            }
          />
          {customTraits.length > 0 ? (
            <div className="space-y-1">
              {customTraits.map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-1 border-b border-neutral-50 dark:border-neutral-850 last:border-0 text-xs"
                >
                  <span className="text-neutral-500 dark:text-neutral-400 capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="text-neutral-700 dark:text-neutral-200 truncate max-w-[160px]">{String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">{t("No traits yet")}</p>
          )}
          <EditTraitsDialog
            userId={data.identified_user_id}
            traits={data.traits}
            open={traitsOpen}
            onOpenChange={setTraitsOpen}
          />
        </SidebarCard>
      )}
    </div>
  );
}
