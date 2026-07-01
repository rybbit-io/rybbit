"use client";

import { useExtracted } from "next-intl";
import { useState, useCallback, ReactNode } from "react";
import { toast } from "@/components/ui/sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { updateSiteConfig, SiteResponse } from "@/api/admin/endpoints";
import { useGetSitesFromOrg } from "@/api/admin/hooks/useSites";
import { planIncludesReplay } from "@/lib/subscription/planUtils";
import { useStripeSubscription } from "@/lib/subscription/useStripeSubscription";
import { Badge } from "@/components/ui/badge";
import { IS_CLOUD } from "@/lib/const";

interface TrackingTabProps {
  siteMetadata: SiteResponse;
  disabled?: boolean;
}

interface ToggleConfig {
  id: string;
  label: string;
  description: string;
  value: boolean;
  key: keyof SiteResponse;
  enabledMessage?: string;
  disabledMessage?: string;
  disabled?: boolean;
  badge?: ReactNode;
}

export function TrackingTab({ siteMetadata, disabled = false }: TrackingTabProps) {
  const t = useExtracted();
  const { refetch } = useGetSitesFromOrg(siteMetadata?.organizationId ?? "");
  const isMobileSite = siteMetadata.type === "mobile";

  const [toggleStates, setToggleStates] = useState({
    sessionReplay: siteMetadata.sessionReplay || false,
    webVitals: siteMetadata.webVitals || false,
    trackErrors: siteMetadata.trackErrors || false,
    trackOutbound: siteMetadata.trackOutbound ?? true,
    trackUrlParams: siteMetadata.trackUrlParams ?? true,
    trackInitialPageView: siteMetadata.trackInitialPageView ?? true,
    trackSpaNavigation: siteMetadata.trackSpaNavigation ?? true,
    trackButtonClicks: siteMetadata.trackButtonClicks ?? false,
    trackCopy: siteMetadata.trackCopy ?? false,
    trackFormInteractions: siteMetadata.trackFormInteractions ?? false,
  });

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const handleToggle = useCallback(
    async (
      key: keyof typeof toggleStates,
      checked: boolean,
      successMessage?: { enabled: string; disabled: string }
    ) => {
      setLoadingStates(prev => ({ ...prev, [key]: true }));
      try {
        await updateSiteConfig(siteMetadata.siteId, { [key]: checked });
        setToggleStates(prev => ({ ...prev, [key]: checked }));
        const message = successMessage
          ? checked
            ? successMessage.enabled
            : successMessage.disabled
          : `${key.replace(/([A-Z])/g, " $1").toLowerCase()} ${checked ? "enabled" : "disabled"}`;
        toast.success(message);
        refetch();
      } catch (error) {
        console.error(`Error updating ${key}:`, error);
        toast.error(`Failed to update ${key.replace(/([A-Z])/g, " $1").toLowerCase()}`);
        setToggleStates(prev => ({ ...prev, [key]: !checked }));
      } finally {
        setLoadingStates(prev => ({ ...prev, [key]: false }));
      }
    },
    [siteMetadata.siteId, refetch]
  );

  const { data: subscription, isLoading: isSubscriptionLoading } = useStripeSubscription();

  const sessionReplayDisabled = !planIncludesReplay(subscription) && IS_CLOUD;

  const standardFeaturesDisabled =
    !subscription?.planName.includes("custom") &&
    !subscription?.planName.includes("standard") &&
    !subscription?.planName.includes("pro") &&
    !subscription?.planName.includes("appsumo") &&
    IS_CLOUD;

  const analyticsToggles: ToggleConfig[] = [
    // Hide the replay toggle for AppSumo tiers without replays (1-3); tiers 4-6 include them
    ...(!isMobileSite &&
    !isSubscriptionLoading &&
    (!subscription?.planName?.startsWith("appsumo") || planIncludesReplay(subscription))
      ? [
          {
            id: "sessionReplay",
            label: t("Session Replay"),
            description: t("Record and replay user sessions to understand user behavior"),
            value: toggleStates.sessionReplay,
            key: "sessionReplay",
            enabledMessage: t("Session replay enabled"),
            disabledMessage: t("Session replay disabled"),
            disabled: sessionReplayDisabled,
            badge: <Badge variant="success">Pro</Badge>,
          } as ToggleConfig,
        ]
      : []),
    ...(IS_CLOUD && !isMobileSite
      ? [
          {
            id: "webVitals",
            label: t("Web Vitals"),
            description: t("Track Core Web Vitals metrics (LCP, CLS, INP, FCP, TTFB)"),
            value: toggleStates.webVitals,
            key: "webVitals" as keyof SiteResponse,
            enabledMessage: t("Web Vitals enabled"),
            disabledMessage: t("Web Vitals disabled"),
            disabled: standardFeaturesDisabled,
            badge: <Badge variant="success">Standard</Badge>,
          } as ToggleConfig,
        ]
      : []),
    ...(!isMobileSite
      ? [
          {
            id: "trackSpaNavigation",
            label: t("SPA Navigation"),
            description: t("Automatically track navigation in single-page applications"),
            value: toggleStates.trackSpaNavigation,
            key: "trackSpaNavigation",
            enabledMessage: t("SPA navigation tracking enabled"),
            disabledMessage: t("SPA navigation tracking disabled"),
          } as ToggleConfig,
          {
            id: "trackUrlParams",
            label: t("URL Parameters"),
            description: t("Include query string parameters in page tracking"),
            value: toggleStates.trackUrlParams,
            key: "trackUrlParams",
            enabledMessage: t("URL parameters tracking enabled"),
            disabledMessage: t("URL parameters tracking disabled"),
          } as ToggleConfig,
        ]
      : []),
    {
      id: "trackInitialPageView",
      label: isMobileSite ? t("Initial Screen View") : t("Initial Page View"),
      description: isMobileSite
        ? t("Automatically track the initial screen passed to the React Native SDK")
        : t("Automatically track the first page view when the script loads"),
      value: toggleStates.trackInitialPageView,
      key: "trackInitialPageView",
      enabledMessage: t("Initial page view tracking enabled"),
      disabledMessage: t("Initial page view tracking disabled"),
    },
  ];

  const autoCaptureToggles: ToggleConfig[] = [
    ...(!isMobileSite
      ? [
          {
            id: "trackOutbound",
            label: t("Outbound Links"),
            description: t("Track when users click on external links"),
            value: toggleStates.trackOutbound,
            key: "trackOutbound",
            enabledMessage: t("Outbound tracking enabled"),
            disabledMessage: t("Outbound tracking disabled"),
          } as ToggleConfig,
        ]
      : []),
    {
      id: "trackErrors",
      label: t("Error Tracking"),
      description: isMobileSite
        ? t("Allow error events sent by the React Native SDK")
        : t("Capture JavaScript errors and exceptions from your site"),
      value: toggleStates.trackErrors,
      key: "trackErrors",
      enabledMessage: t("Error tracking enabled"),
      disabledMessage: t("Error tracking disabled"),
      disabled: standardFeaturesDisabled,
      badge: <Badge variant="success">Standard</Badge>,
    },
    ...(!isMobileSite
      ? [
          {
            id: "trackButtonClicks",
            label: t("Button Clicks"),
            description: t("Automatically track clicks on all buttons"),
            value: toggleStates.trackButtonClicks,
            key: "trackButtonClicks",
            enabledMessage: t("Button click tracking enabled"),
            disabledMessage: t("Button click tracking disabled"),
            disabled: standardFeaturesDisabled,
            badge: <Badge variant="success">Standard</Badge>,
          } as ToggleConfig,
          {
            id: "trackCopy",
            label: t("Copy Events"),
            description: t("Track when users copy text from your site"),
            value: toggleStates.trackCopy,
            key: "trackCopy",
            enabledMessage: t("Copy tracking enabled"),
            disabledMessage: t("Copy tracking disabled"),
            disabled: standardFeaturesDisabled,
            badge: <Badge variant="success">Standard</Badge>,
          } as ToggleConfig,
          {
            id: "trackFormInteractions",
            label: t("Form Interactions"),
            description: t("Automatically track form submissions and input/select changes"),
            value: toggleStates.trackFormInteractions,
            key: "trackFormInteractions",
            enabledMessage: t("Form interaction tracking enabled"),
            disabledMessage: t("Form interaction tracking disabled"),
            disabled: standardFeaturesDisabled,
            badge: <Badge variant="success">Standard</Badge>,
          } as ToggleConfig,
        ]
      : []),
  ];

  const renderToggleSection = (toggles: ToggleConfig[], title: string) => (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {toggles.map(toggle => (
        <div key={toggle.id} className="flex items-center justify-between">
          <div>
            <Label htmlFor={toggle.id} className="text-sm font-medium text-foreground flex items-center gap-2">
              {toggle.label} {toggle.badge && IS_CLOUD && toggle.badge}
            </Label>
            <p className="text-xs text-muted-foreground mt-1">{toggle.description}</p>
          </div>
          <Switch
            id={toggle.id}
            checked={toggle.value}
            disabled={loadingStates[toggle.key] || disabled || toggle.disabled}
            onCheckedChange={checked =>
              handleToggle(
                toggle.key as keyof typeof toggleStates,
                checked,
                toggle.enabledMessage && toggle.disabledMessage
                  ? { enabled: toggle.enabledMessage, disabled: toggle.disabledMessage }
                  : undefined
              )
            }
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {renderToggleSection(analyticsToggles, t("Analytics Features"))}
      {renderToggleSection(autoCaptureToggles, t("Auto Capture"))}
    </div>
  );
}
