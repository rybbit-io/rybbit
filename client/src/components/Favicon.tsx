"use client";

import { useEffect, useState } from "react";
import { BACKEND_URL } from "@/lib/const";
import { cn } from "../lib/utils";

export function Favicon({ domain, className }: { domain: string; className?: string }) {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const src = `${BACKEND_URL}/favicon?domain=${encodeURIComponent(domain)}&v=${refreshVersion}`;

  useEffect(() => {
    const timer = setInterval(() => setRefreshVersion(Date.now()), 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return <FaviconImage key={src} src={src} domain={domain} className={className} />;
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
