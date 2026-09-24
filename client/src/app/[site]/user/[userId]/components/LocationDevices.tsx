"use client";

import { useExtracted } from "next-intl";
import { ReactNode, useState } from "react";
import { UserDeviceBreakdown, UserInfo, UserLocationBreakdown } from "../../../../../api/analytics/endpoints";
import { getCountryName, getLanguageName } from "../../../../../lib/utils";
import { Browser } from "../../../components/shared/icons/Browser";
import { CountryFlag } from "../../../components/shared/icons/CountryFlag";
import { DeviceIcon } from "../../../components/shared/icons/Device";
import { OperatingSystem } from "../../../components/shared/icons/OperatingSystem";
import { InfoRow, InfoRowSkeleton } from "./SidebarPrimitives";

const COLLAPSED_ROWS = 4;

// Same visual grammar as StandardSection rows: bar normalized to the largest
// row, true session share printed on the right.
function ShareRow({
  icon,
  label,
  share,
  barWidth,
  title,
}: {
  icon: ReactNode;
  label: ReactNode;
  share: number;
  barWidth: number;
  title: string;
}) {
  return (
    <div className="relative h-6 flex items-center text-xs" title={title}>
      <div className="absolute inset-0 bg-dataviz opacity-25 rounded-md" style={{ width: `${barWidth}%` }} />
      <div className="z-10 mx-2 flex justify-between items-center w-full gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {icon}
          <span className="truncate text-neutral-700 dark:text-neutral-200">{label}</span>
        </div>
        <span className="shrink-0 text-neutral-500 dark:text-neutral-400">{Math.round(share)}%</span>
      </div>
    </div>
  );
}

function BreakdownList<T>({
  label,
  items,
  getSessions,
  renderRow,
}: {
  label: string;
  items: T[];
  getSessions: (item: T) => number;
  renderRow: (item: T, share: number, barWidth: number) => ReactNode;
}) {
  const t = useExtracted();
  const [showAll, setShowAll] = useState(false);

  const total = items.reduce((sum, item) => sum + getSessions(item), 0);
  const max = Math.max(...items.map(getSessions));
  const visible = showAll ? items : items.slice(0, COLLAPSED_ROWS);
  const hiddenCount = items.length - COLLAPSED_ROWS;

  return (
    <div>
      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mt-2 mb-1">
        {label} ({items.length})
      </div>
      <div className="flex flex-col gap-1">
        {visible.map(item => renderRow(item, (getSessions(item) / total) * 100, (getSessions(item) / max) * 100))}
      </div>
      {hiddenCount > 0 && (
        <button
          type="button"
          className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 rounded-sm"
          onClick={() => setShowAll(prev => !prev)}
        >
          {showAll ? t("Show less") : t("+{count} more", { count: String(hiddenCount) })}
        </button>
      )}
    </div>
  );
}

function locationLabel(location: UserLocationBreakdown, getRegionName: (region: string) => string) {
  if (location.city) return location.city;
  if (location.region) return getRegionName(location.region) || location.region;
  return getCountryName(location.country) || location.country;
}

export function LocationDevices({
  data,
  isLoading,
  getRegionName,
}: {
  data: UserInfo | undefined;
  isLoading: boolean;
  getRegionName: (region: string) => string;
}) {
  const t = useExtracted();

  if (isLoading) {
    return (
      <div className="space-y-0">
        <InfoRowSkeleton labelWidth="w-14" valueWidth="w-24" withIcon />
        <InfoRowSkeleton labelWidth="w-12" valueWidth="w-32" />
        <InfoRowSkeleton labelWidth="w-16" valueWidth="w-20" />
        <InfoRowSkeleton labelWidth="w-12" valueWidth="w-14" withIcon />
        <InfoRowSkeleton labelWidth="w-14" valueWidth="w-20" withIcon />
        <InfoRowSkeleton labelWidth="w-8" valueWidth="w-24" withIcon />
        <InfoRowSkeleton labelWidth="w-12" valueWidth="w-16" />
      </div>
    );
  }

  const locations = data?.locations ?? [];
  const devices = data?.devices ?? [];
  const multiLocation = locations.length > 1;
  const multiDevice = devices.length > 1;

  return (
    <div>
      {multiLocation ? (
        <BreakdownList
          label={t("Locations")}
          items={locations}
          getSessions={location => location.sessions}
          renderRow={(location, share, barWidth) => (
            <ShareRow
              key={`${location.country}-${location.region}-${location.city}`}
              icon={<CountryFlag country={location.country} className="w-4 h-4 shrink-0" />}
              label={
                <>
                  {locationLabel(location, getRegionName)}
                  {location.city && location.region && (
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {", "}
                      {getRegionName(location.region)}
                    </span>
                  )}
                </>
              }
              share={share}
              barWidth={barWidth}
              title={`${getCountryName(location.country) || location.country} — ${t("{count} sessions", {
                count: String(location.sessions),
              })}`}
            />
          )}
        />
      ) : (
        <>
          <InfoRow
            icon={<CountryFlag country={data?.country || ""} className="w-4 h-4" />}
            label={t("Country")}
            value={data?.country ? getCountryName(data.country) : "—"}
          />
          <InfoRow
            label={t("Region")}
            value={
              <span className="truncate max-w-[160px] inline-block">
                {data?.region ? getRegionName(data.region) : "—"}
                {data?.city && `, ${data.city}`}
              </span>
            }
          />
        </>
      )}

      <InfoRow label={t("Language")} value={data?.language ? getLanguageName(data.language) : "—"} />

      {multiDevice ? (
        <BreakdownList
          label={t("Devices")}
          items={devices}
          getSessions={device => device.sessions}
          renderRow={(device, share, barWidth) => (
            <ShareRow
              key={`${device.device_type}-${device.browser}-${device.operating_system}`}
              icon={
                <span className="flex items-center gap-1 shrink-0">
                  <DeviceIcon deviceType={device.device_type} size={13} />
                  <Browser browser={device.browser || "Unknown"} size={13} />
                  <OperatingSystem os={device.operating_system} size={13} />
                </span>
              }
              label={[device.browser, device.operating_system].filter(Boolean).join(" · ") || device.device_type}
              share={share}
              barWidth={barWidth}
              title={[
                device.device_type,
                device.browser && `${device.browser}${device.browser_version ? ` v${device.browser_version}` : ""}`,
                device.operating_system &&
                  `${device.operating_system}${device.operating_system_version ? ` v${device.operating_system_version}` : ""}`,
                device.screen_width && device.screen_height && `${device.screen_width}×${device.screen_height}`,
                t("{count} sessions", { count: String(device.sessions) }),
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          )}
        />
      ) : (
        <>
          <InfoRow
            icon={<DeviceIcon deviceType={data?.device_type || ""} size={13} />}
            label={t("Device")}
            value={data?.device_type ?? "—"}
          />
          <InfoRow
            icon={<Browser browser={data?.browser || "Unknown"} size={13} />}
            label={t("Browser")}
            value={data?.browser ? `${data.browser}${data.browser_version ? ` v${data.browser_version}` : ""}` : "—"}
          />
          <InfoRow
            icon={<OperatingSystem os={data?.operating_system || ""} size={13} />}
            label={t("OS")}
            value={
              data?.operating_system
                ? `${data.operating_system}${data.operating_system_version ? ` v${data.operating_system_version}` : ""}`
                : "—"
            }
          />
          <InfoRow
            label={t("Screen")}
            value={data?.screen_width && data?.screen_height ? `${data.screen_width}×${data.screen_height}` : "—"}
          />
        </>
      )}
    </div>
  );
}
