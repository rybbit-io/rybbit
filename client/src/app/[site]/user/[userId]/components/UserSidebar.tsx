"use client";

import { Pencil } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";

import { UserInfo, UserSessionCountResponse } from "@/api/analytics/endpoints";
import { ChannelIcon, extractDomain, getDisplayName } from "@/components/Channel";
import { EditTraitsDialog } from "@/components/EditTraitsDialog";
import { Favicon } from "@/components/Favicon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useConfigs } from "@/lib/configs";
import { userStore } from "@/lib/userStore";

import { PerformanceMetric } from "../../../performance/performanceStore";
import {
  formatMetricValue,
  getMetricColor,
  getMetricUnit,
  METRIC_LABELS,
  METRIC_LABELS_SHORT,
} from "../../../performance/utils/performanceUtils";
import { VisitCalendar } from "./Calendar";
import { LocationDevices } from "./LocationDevices";
import { InfoRow, InfoRowSkeleton, SidebarSection } from "./SidebarPrimitives";
import { UserLocationMap } from "./UserLocationMap";

interface UserSidebarProps {
  data: UserInfo | undefined;
  isLoading: boolean;
  sessionCount: UserSessionCountResponse[];
  isSessionCountLoading: boolean;
  sessionCountError: boolean;
  getRegionName: (region: string) => string;
}

const VITALS_ORDER: PerformanceMetric[] = ["lcp", "cls", "inp", "fcp", "ttfb"];

function formatTraitValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function UserSidebar({
  data,
  isLoading,
  sessionCount,
  isSessionCountLoading,
  sessionCountError,
  getRegionName,
}: UserSidebarProps) {
  const t = useExtracted();
  const { configs } = useConfigs();
  const { user } = userStore();
  const [traitsOpen, setTraitsOpen] = useState(false);

  const isIdentified = !!data?.identified_user_id;
  const customTraits = data?.traits
    ? Object.entries(data.traits).filter(([key]) => !["username", "name", "email"].includes(key))
    : [];
  const firstReferrerDomain = data?.first_referrer ? extractDomain(data.first_referrer) : null;
  const channelChanged = !!data?.last_channel && data.last_channel !== data.first_channel;
  const vitals = data?.vitals ?? null;
  const vitalsToShow = vitals ? VITALS_ORDER.filter(metric => vitals[`${metric}_p75`] != null) : [];

  return (
    <aside className="space-y-3" aria-label={t("User details")}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("Visitor context")}</CardTitle>
          <CardDescription className="text-neutral-600 dark:text-neutral-400">
            {t("Attribution and latest known details for this user.")}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          <SidebarSection title={t("First touch")} description={t("How this user first arrived.")}>
            {isLoading ? (
              <div>
                <InfoRowSkeleton labelWidth="w-14" valueWidth="w-24" withIcon />
                <InfoRowSkeleton labelWidth="w-12" valueWidth="w-20" withIcon />
                <InfoRowSkeleton labelWidth="w-20" valueWidth="w-28" />
              </div>
            ) : (
              <div>
                <InfoRow
                  icon={
                    data?.first_channel ? (
                      <ChannelIcon channel={data.first_channel} className="h-3.5 w-3.5" />
                    ) : undefined
                  }
                  label={t("Channel")}
                  value={data?.first_channel || "—"}
                />
                <InfoRow
                  icon={
                    firstReferrerDomain ? <Favicon domain={firstReferrerDomain} className="h-3.5 w-3.5" /> : undefined
                  }
                  label={t("Referrer")}
                  value={firstReferrerDomain ? getDisplayName(firstReferrerDomain) : "—"}
                />
                <InfoRow
                  label={t("Landing page")}
                  value={
                    data?.first_entry_page ? (
                      <span className="block min-w-0 truncate" title={data.first_entry_page}>
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
                    value={
                      <span className="block min-w-0 truncate" title={data.first_utm_source}>
                        {data.first_utm_source}
                      </span>
                    }
                  />
                )}
                {data?.first_utm_medium && (
                  <InfoRow
                    label={t("Medium")}
                    value={
                      <span className="block min-w-0 truncate" title={data.first_utm_medium}>
                        {data.first_utm_medium}
                      </span>
                    }
                  />
                )}
                {data?.first_utm_campaign && (
                  <InfoRow
                    label={t("Campaign")}
                    value={
                      <span className="block min-w-0 truncate" title={data.first_utm_campaign}>
                        {data.first_utm_campaign}
                      </span>
                    }
                  />
                )}
                {channelChanged && (
                  <InfoRow
                    icon={<ChannelIcon channel={data.last_channel} className="h-3.5 w-3.5" />}
                    label={t("Latest channel")}
                    value={data.last_channel}
                  />
                )}
              </div>
            )}
          </SidebarSection>

          <SidebarSection
            title={t("Location & device")}
            description={t("Latest context, with session share when it changed.")}
          >
            <LocationDevices data={data} isLoading={isLoading} getRegionName={getRegionName} />
            {!isLoading && data?.ip && (
              <InfoRow
                label={t("Latest IP")}
                value={
                  <span className="truncate font-mono" title={data.ip}>
                    {data.ip}
                  </span>
                }
              />
            )}
            {configs?.mapboxToken && data?.country && (
              <div className="mt-3 h-36 overflow-hidden rounded-lg border border-neutral-100 dark:border-neutral-800">
                <UserLocationMap country={data.country} region={data.region} city={data.city} />
              </div>
            )}
          </SidebarSection>

          {vitals && vitalsToShow.length > 0 && (
            <SidebarSection
              title={t("Web vitals")}
              description={t("75th percentile across this user's performance events.")}
            >
              <div>
                {vitalsToShow.map(metric => {
                  const value = vitals[`${metric}_p75`] as number;
                  return (
                    <InfoRow
                      key={metric}
                      label={
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help underline decoration-dotted underline-offset-2">
                              {METRIC_LABELS_SHORT[metric]}
                            </span>
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
            </SidebarSection>
          )}

          {isIdentified && data && (customTraits.length > 0 || !!user) && (
            <SidebarSection
              title={t("User traits")}
              description={t("Properties attached to this identified user.")}
              action={
                user ? (
                  <Button
                    variant="ghost"
                    size="smIcon"
                    className="h-7 w-7 text-neutral-600 dark:text-neutral-400"
                    aria-label={t("Edit Traits")}
                    onClick={() => setTraitsOpen(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                ) : undefined
              }
            >
              {customTraits.length > 0 ? (
                <div>
                  {customTraits.map(([key, value]) => {
                    const formattedValue = formatTraitValue(value);
                    return (
                      <InfoRow
                        key={key}
                        label={<span className="capitalize">{key.replace(/_/g, " ")}</span>}
                        value={
                          <span className="block min-w-0 truncate" title={formattedValue}>
                            {formattedValue}
                          </span>
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {t("No custom traits have been added yet.")}
                </p>
              )}
              <EditTraitsDialog
                userId={data.identified_user_id}
                traits={data.traits}
                open={traitsOpen}
                onOpenChange={setTraitsOpen}
              />
            </SidebarSection>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">{t("Activity history")}</CardTitle>
          <CardDescription className="text-neutral-600 dark:text-neutral-400">
            {t("Sessions recorded during the last 120 days.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          {isSessionCountLoading ? (
            <Skeleton className="h-[140px] w-full motion-reduce:animate-none" />
          ) : sessionCountError ? (
            <div
              className="flex h-[140px] items-center justify-center text-center text-xs text-neutral-600 dark:text-neutral-400"
              role="status"
            >
              {t("Activity history could not be loaded.")}
            </div>
          ) : sessionCount.length > 0 ? (
            <div className="h-[140px]">
              <VisitCalendar sessionCount={sessionCount} />
            </div>
          ) : (
            <div className="flex h-[140px] items-center justify-center text-center text-xs text-neutral-600 dark:text-neutral-400">
              {t("No sessions were recorded in the last 120 days.")}
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
