"use client";

import { Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { BACKEND_URL } from "@/lib/const";
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
  const [refreshVersion, setRefreshVersion] = useState(0);
  const iconVersion = useSiteIcons(state => (siteId === undefined ? 0 : (state.versions[siteId] ?? 0)));

  useEffect(() => {
    const timer = setInterval(() => setRefreshVersion(Date.now()), 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Mobile sites have a package name, not a domain, so there is no site to fetch an
  // icon from - they use the icon uploaded in site settings instead.
  if (siteType && siteType !== "web") {
    if (siteId === undefined) {
      return <MobilePlaceholder className={className} />;
    }
    const src = `${BACKEND_URL}/sites/${siteId}/icon?v=${iconVersion}`;
    return <AppIcon key={src} src={src} domain={domain} className={className} />;
  }

  const src = `${BACKEND_URL}/favicon?domain=${encodeURIComponent(domain)}&v=${refreshVersion}`;
  return <FaviconImage key={src} src={src} domain={domain} className={className} />;
}

function MobilePlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn("bg-neutral-700 rounded-full flex items-center justify-center text-white", className ?? "w-4 h-4")}
    >
      <Smartphone className="w-[60%] h-[60%]" />
    </div>
  );
}

function AppIcon({ src, domain, className }: { src: string; domain: string; className?: string }) {
  const [imageError, setImageError] = useState(false);
  if (imageError) {
    return <MobilePlaceholder className={className} />;
  }

  return (
    <img
      src={src}
      className={cn("rounded", className ?? "w-4 h-4")}
      alt={`Icon for ${domain}`}
      onError={() => setImageError(true)}
    />
  );
}

function FaviconImage({ src, domain, className }: { src: string; domain: string; className?: string }) {
  const [imageError, setImageError] = useState(false);
  if (imageError) {
    return (
      <div
        className={cn(
          "bg-neutral-700 rounded-full flex items-center justify-center text-xs font-medium text-white",
          className ?? "w-4 h-4"
        )}
      >
        {domain.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      className={cn(className ?? "w-4 h-4")}
      alt={`Favicon for ${domain}`}
      onError={() => setImageError(true)}
    />
  );
}
