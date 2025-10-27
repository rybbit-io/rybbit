import { ArrowRight, Crown, ExternalLink } from "lucide-react";
import Link from "next/link";
import React, { ReactNode, useMemo, useRef, useEffect, useState } from "react";
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

  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [overlayRemoved, setOverlayRemoved] = useState(false);

  const disabled = useMemo(() => {
    if (requiredPlan === "pro") {
      if (organization?.createdAt && DateTime.fromJSDate(organization?.createdAt) < DateTime.fromISO("2025-09-19")) {
        return false;
      }
      return !subscription?.isPro;
    }
    return subscription?.eventLimit === DEFAULT_EVENT_LIMIT;
  }, [subscription, requiredPlan, organization]);

  // MutationObserver to detect and restore overlay if removed or modified
  useEffect(() => {
    if (!disabled || !containerRef.current || !contentRef.current) return;

    // Watch for overlay removal
    const containerObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === overlayRef.current) {
            // Force re-render to restore overlay
            setOverlayRemoved((prev) => !prev);
          }
        });
      });
    });

    containerObserver.observe(containerRef.current, {
      childList: true,
      subtree: false,
    });

    // Watch for style/class attribute changes on blurred content
    const contentObserver = new MutationObserver(() => {
      if (contentRef.current) {
        const currentStyle = contentRef.current.getAttribute("style") || "";
        // Check if critical styles are missing
        if (!currentStyle.includes("blur") || !currentStyle.includes("pointer-events: none")) {
          contentRef.current.style.filter = `blur(${blur}px)`;
          contentRef.current.style.pointerEvents = "none";
          contentRef.current.style.userSelect = "none";
        }
      }
    });

    if (contentRef.current) {
      contentObserver.observe(contentRef.current, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    }

    // Periodic validation to restore styles if tampered with
    const validationInterval = setInterval(() => {
      if (contentRef.current && disabled) {
        const currentStyle = contentRef.current.getAttribute("style") || "";
        if (!currentStyle.includes("blur") || !currentStyle.includes("pointer-events: none")) {
          contentRef.current.style.filter = `blur(${blur}px)`;
          contentRef.current.style.pointerEvents = "none";
          contentRef.current.style.userSelect = "none";
        }
      }
    }, 2000); // Check every 2 seconds

    return () => {
      containerObserver.disconnect();
      contentObserver.disconnect();
      clearInterval(validationInterval);
    };
  }, [disabled, overlayRemoved, blur]);

  if (!disabled || data?.user?.role === "admin" || globalThis.location.hostname === DEMO_HOSTNAME) {
    return <>{children}</>;
  }

  const borderRadiusStyle = borderRadius > 0 ? { borderRadius: `${borderRadius}px` } : {};

  return (
    <div ref={containerRef} className="relative" style={style}>
      <div
        ref={contentRef}
        className={disabled ? "filter" : ""}
        style={disabled ? { filter: `blur(${blur}px)`, pointerEvents: "none", userSelect: "none" } : {}}
      >
        {children}
      </div>
      <div
        ref={overlayRef}
        className="absolute inset-0 flex items-center justify-center z-10"
        style={borderRadiusStyle}
      >
        {showMessage && (
          <div className="flex items-center justify-center">
            {site?.isOwner ? ownerMessage(message, featurePath, requiredPlan) : userMessage(message, featurePath)}
          </div>
        )}
      </div>
    </div>
  );
};
