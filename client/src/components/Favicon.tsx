import { Smartphone } from "lucide-react";
import { useState } from "react";
import { BACKEND_URL } from "../lib/const";
import { cn } from "../lib/utils";
import { useSiteIcons } from "../lib/siteIcons";

export function Favicon({
  domain,
  className,
  siteType,
  siteId,
}: {
  domain: string;
  className?: string;
  siteType?: "web" | "mobile" | null;
  siteId?: number;
}) {
  const iconVersion = useSiteIcons(state => (siteId === undefined ? 0 : (state.versions[siteId] ?? 0)));
  const src =
    siteType === "mobile"
      ? `${BACKEND_URL}/sites/${siteId}/icon?v=${iconVersion}`
      : `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageError = failedSrc === src;
  const firstLetter = domain.charAt(0).toUpperCase();

  if (siteType && siteType !== "web") {
    if (siteId !== undefined && !imageError) {
      return (
        <img
          src={src}
          className={cn("rounded", className ?? "w-4 h-4")}
          alt={`Icon for ${domain}`}
          onError={() => setFailedSrc(src)}
        />
      );
    }

    return (
      <div
        className={cn(
          "bg-neutral-700 rounded-full flex items-center justify-center text-white",
          className ?? "w-4 h-4"
        )}
      >
        <Smartphone className="w-[60%] h-[60%]" />
      </div>
    );
  }

  if (imageError) {
    return (
      <div
        className={cn(
          "bg-neutral-700 rounded-full flex items-center justify-center text-xs font-medium text-white",
          className ?? "w-4 h-4"
        )}
      >
        {firstLetter}
      </div>
    );
  }

  return (
    <img
      src={src}
      className={cn(className ?? "w-4 h-4")}
      alt={`Favicon for ${domain}`}
      onError={() => setFailedSrc(src)}
    />
  );
}
