import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCurrentSite } from "../api/admin/sites";
import { DEFAULT_EVENT_LIMIT } from "../lib/subscription/constants";
import { Button } from "./ui/button";

export function FreePlanBanner() {
  const { site, subscription } = useCurrentSite();

  if (!site) return null;

  // Format numbers with commas
  const formatNumber = (num: number = 0) => {
    return num.toLocaleString();
  };

  if (subscription?.eventLimit === DEFAULT_EVENT_LIMIT) {
    return (
      <div className="mt-4 px-4 py-3 rounded-lg border border-blue-200 dark:border-blue-400/30 bg-blue-100/80 dark:bg-blue-900/20 text-sm flex gap-4 items-center">
        <div className="text-blue-700 dark:text-blue-300 flex items-center font-medium">
          <span>
            Free plan: Using <strong>{formatNumber(subscription?.monthlyEventCount || 0)}</strong> of{" "}
            <strong>{formatNumber(subscription?.eventLimit || 0)}</strong> events
          </span>
        </div>
        {site.isOwner && (
          <Button variant="success" size="sm" asChild>
            <Link href="/subscribe">
              Upgrade <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return null;
}
