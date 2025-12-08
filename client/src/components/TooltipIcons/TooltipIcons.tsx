import { Laptop, Smartphone } from "lucide-react";
import { Browser } from "../../app/[site]/components/shared/icons/Browser";
import { CountryFlag } from "../../app/[site]/components/shared/icons/CountryFlag";
import { OperatingSystem } from "../../app/[site]/components/shared/icons/OperatingSystem";
import { getRegionName } from "../../lib/geo";
import { getCountryName } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

// DeviceIcon component for displaying mobile/desktop icons
function DeviceIcon({ deviceType, size = 16 }: { deviceType: string; size?: number }) {
  const type = deviceType.toLowerCase();

  if (type.includes("mobile") || type.includes("tablet")) {
    return <Smartphone width={size} height={size} />;
  }

  return <Laptop width={size} height={size} />;
}

export function CountryFlagTooltipIcon({
  country,
  city,
  region,
  className,
}: {
  country: string;
  city: string;
  region: string;
  className?: string;
}) {
  const getFullLocation = <T extends { country: string; city: string; region: string }>(session: T) => {
    let location = "";
    if (session.city) {
      location += `${session.city}, `;
    }
    if (getRegionName(session.region)) {
      location += `${getRegionName(session.region)}, `;
    }
    if (session.country) {
      location += getCountryName(session.country);
    }
    return location;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center">
          <CountryFlag country={country} className={className} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getFullLocation({ country, city, region })}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function BrowserTooltipIcon({
  browser,
  browser_version,
  size = 16,
}: {
  browser: string;
  browser_version?: string;
  size?: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="shrink-0">
          <Browser browser={browser || "Unknown"} size={size} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {browser || "Unknown browser"}
          {browser_version && ` ${browser_version}`}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export function OperatingSystemTooltipIcon({
  operating_system,
  operating_system_version,
  size = 16,
}: {
  operating_system: string;
  operating_system_version?: string;
  size?: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="shrink-0">
          <OperatingSystem os={operating_system || ""} size={size} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {operating_system || "Unknown OS"}
          {operating_system_version && ` ${operating_system_version}`}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export function DeviceTypeTooltipIcon({
  device_type,
  screen_width,
  screen_height,
  size = 18,
}: {
  device_type: string;
  screen_width?: number;
  screen_height?: number;
  size?: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <DeviceIcon deviceType={device_type || ""} size={size} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {device_type || "Unknown device"}
          {screen_width && screen_height && ` ${screen_width} x ${screen_height}`}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
