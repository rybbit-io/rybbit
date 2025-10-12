import { ArrowRight, Crown, ExternalLink } from "lucide-react";
import Link from "next/link";
import React, { ReactNode, useMemo } from "react";
import { useCurrentSite } from "../api/admin/sites";
import { DEFAULT_EVENT_LIMIT } from "../lib/subscription/constants";
import { Button } from "./ui/button";
import { authClient } from "../lib/auth";
import { DEMO_HOSTNAME } from "../lib/const";
import { DateTime } from "luxon";

interface DisabledOverlayProps {
  children: ReactNode;
  message?: string;
  featurePath?: string;
  blur?: number;
  borderRadius?: number;
  showMessage?: boolean;
  style?: React.CSSProperties;
  requiredPlan?: "pro" | "standard";
}

function ownerMessage(message: string, featurePath?: string, requiredPlan?: "pro" | "standard") {
  return (
    <div className="bg-neutral-900 rounded-lg  border border-neutral-700 shadow-xl flex flex-col gap-3 p-4">
      <div className="flex gap-3">
        <Crown className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <div className="flex-1 space-y-1">
          <p className="text-sm text-muted-foreground">
            Upgrade to{" "}
            <span className="font-medium text-foreground">{requiredPlan === "pro" ? "Pro" : "Standard"}</span> to unlock{" "}
            {message}
          </p>
          {featurePath && (
            <Link
              href={`https://${DEMO_HOSTNAME}/21/${featurePath}`}
              target="_blank"
              className="text-sm text-neutral-100 hover:underline flex items-center gap-1"
            >
              See a demo of this feature
              <ExternalLink className="ml-1 h-4 w-4" />
            </Link>
          )}
        </div>
        <Button asChild size="sm" variant="success">
          <Link href="/subscribe">
            Upgrade <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function userMessage(message: string, featurePath?: string) {
  return (
    <div className="bg-neutral-900 rounded-lg  border border-neutral-700 shadow-xl flex flex-col gap-3 p-4">
      <div className="flex gap-3">
        <Crown className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <div className="flex-1 space-y-1">
          <p className="text-sm text-muted-foreground">
            Ask your organization owner to upgrade to <span className="font-medium text-foreground">Pro</span> to unlock{" "}
            {message}
          </p>
          {featurePath && (
            <Link
              href={`https://${DEMO_HOSTNAME}/21/${featurePath}`}
              target="_blank"
              className="text-sm text-neutral-100 hover:underline flex items-center gap-1"
            >
              See a demo of this feature
              <ExternalLink className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export const DisabledOverlay: React.FC<DisabledOverlayProps> = ({
  children,
  message = "this feature",
  featurePath,
  blur = 10,
  borderRadius = 0,
  showMessage = true,
  style,
  requiredPlan = "standard",
}) => {
  const { subscription, site } = useCurrentSite();

  const { data } = authClient.useSession();

  const { data: organization } = authClient.useActiveOrganization();

  const disabled = useMemo(() => {
    if (requiredPlan === "pro") {
      if (organization?.createdAt && DateTime.fromJSDate(organization?.createdAt) < DateTime.fromISO("2025-09-19")) {
        return false;
      }
      return !subscription?.isPro;
    }
    return subscription?.eventLimit === DEFAULT_EVENT_LIMIT;
  }, [subscription, requiredPlan]);

  if (!disabled || data?.user?.role === "admin" || globalThis.location.hostname === DEMO_HOSTNAME) {
    return <>{children}</>;
  }

  const borderRadiusStyle = borderRadius > 0 ? { borderRadius: `${borderRadius}px` } : {};

  return (
    <div className="relative" style={style}>
      <div className={disabled ? "filter" : ""} style={disabled ? { filter: `blur(${blur}px)` } : {}}>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10" style={borderRadiusStyle}>
        {showMessage && (
          <div className="flex items-center justify-center">
            {site?.isOwner ? ownerMessage(message, featurePath, requiredPlan) : userMessage(message, featurePath)}
          </div>
        )}
      </div>
    </div>
  );
};
