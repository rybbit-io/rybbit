import { Smartphone } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";

export function Favicon({
  domain,
  className,
  siteType,
}: {
  domain: string;
  className?: string;
  siteType?: "web" | "app";
}) {
  const [imageError, setImageError] = useState(false);
  const firstLetter = domain.charAt(0).toUpperCase();

  if (siteType && siteType !== "web") {
    const Icon = Smartphone;
    return (
      <div
        className={cn(
          "bg-neutral-700 rounded-full flex items-center justify-center text-white",
          className ?? "w-4 h-4"
        )}
      >
        <Icon className="w-[60%] h-[60%]" />
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
      src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
      className={cn(className ?? "w-4 h-4")}
      alt={`Favicon for ${domain}`}
      onError={() => setImageError(true)}
    />
  );
}
