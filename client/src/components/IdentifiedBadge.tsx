import { IdCard } from "lucide-react";
import { useExtracted } from "next-intl";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface IdentifiedBadgeProps {
  className?: string;
  traits?: Record<string, unknown> | null;
}

export function IdentifiedBadge({ className, traits }: IdentifiedBadgeProps) {
  const t = useExtracted();
  // Filter out null/undefined values and format for display
  const traitEntries = traits
    ? Object.entries(traits).filter(([, value]) => value !== null && value !== undefined)
    : [];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="success" className={className}>
          <IdCard className="w-3 h-3" />
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-medium mb-1">{t("Identified User")}</p>
        {traitEntries.length > 0 ? (
          <div className="text-xs space-y-0.5">
            {traitEntries.slice(0, 8).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-neutral-400">{key}:</span>
                <span className="truncate max-w-[180px]">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
            {traitEntries.length > 8 && (
              <div className="text-neutral-400 text-xs mt-1">
                {t("+{count} more traits", { count: String(traitEntries.length - 8) })}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-neutral-400">{t("No traits set")}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
