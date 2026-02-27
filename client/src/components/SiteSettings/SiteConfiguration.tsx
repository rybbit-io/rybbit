"use client";

import { AlertTriangle } from "lucide-react";
import { useExtracted } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useCallback, ReactNode } from "react";
import { toast } from "@/components/ui/sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { deleteSite, updateSiteConfig, SiteResponse } from "@/api/admin/endpoints";
import { useGetSitesFromOrg } from "@/api/admin/hooks/useSites";
import { normalizeDomain } from "@/lib/utils";
import { IPExclusionManager } from "./IPExclusionManager";
import { CountryExclusionManager } from "./CountryExclusionManager";
import { GSCManager } from "./GSCManager";
import { useStripeSubscription } from "../../lib/subscription/useStripeSubscription";
import { Badge } from "../ui/badge";
import { IS_CLOUD } from "../../lib/const";

interface SiteConfigurationProps {
  siteMetadata: SiteResponse;
  disabled?: boolean;
  onClose?: () => void;
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

export function SiteConfiguration({ siteMetadata, disabled = false, onClose }: SiteConfigurationProps) {
  const t = useExtracted();
  const { refetch } = useGetSitesFromOrg(siteMetadata?.organizationId ?? "");
  const router = useRouter();

  const [newDomain, setNewDomain] = useState(siteMetadata.domain);
  const [isChangingDomain, setIsChangingDomain] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Track all toggle states and loading states in single objects
  const [toggleStates, setToggleStates] = useState({
    public: siteMetadata.public || false,
    saltUserIds: siteMetadata.saltUserIds || false,
    blockBots: siteMetadata.blockBots || false,
    sessionReplay: siteMetadata.sessionReplay || false,
    webVitals: siteMetadata.webVitals || false,
    trackErrors: siteMetadata.trackErrors || false,
    trackOutbound: siteMetadata.trackOutbound ?? true,
    trackUrlParams: siteMetadata.trackUrlParams ?? true,
    trackInitialPageView: siteMetadata.trackInitialPageView ?? true,
    trackSpaNavigation: siteMetadata.trackSpaNavigation ?? true,
    trackIp: siteMetadata.trackIp ?? false,
    trackButtonClicks: siteMetadata.trackButtonClicks ?? false,
    trackCopy: siteMetadata.trackCopy ?? false,
    trackFormInteractions: siteMetadata.trackFormInteractions ?? false,
  });

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  // Generic toggle handler
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

  const handleDomainChange = async () => {
    if (!newDomain) {
      toast.error(t("Domain cannot be empty"));
      return;
    }

    try {
      setIsChangingDomain(true);
      const normalizedDomain = normalizeDomain(newDomain);
      await updateSiteConfig(siteMetadata.siteId, { domain: normalizedDomain });
      toast.success(t("Domain updated successfully"));
      router.refresh();
      refetch();
    } catch (error) {
      console.error("Error changing domain:", error);
      toast.error(t("Failed to update domain"));
    } finally {
      setIsChangingDomain(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteSite(siteMetadata.siteId);
      toast.success(t("Site deleted successfully"));
      router.push("/");
      onClose?.();
      refetch();
    } catch (error) {
      console.error("Error deleting site:", error);
      toast.error(t("Failed to delete site"));
    } finally {
      setIsDeleting(false);
    }
  };

  // Configuration for privacy & security toggles
  const privacyToggles: ToggleConfig[] = [
    {
      id: "public",
      label: t("Public Analytics"),
      description: t("Anyone can view your site analytics without logging in"),
      value: toggleStates.public,
      key: "public",
      enabledMessage: t("Site analytics made public"),
      disabledMessage: t("Site analytics made private"),
    },
    {
      id: "saltUserIds",
      label: t("User ID Salting"),
      description: t("User IDs will be salted with a daily rotating key for enhanced privacy"),
      value: toggleStates.saltUserIds,
      key: "saltUserIds",
      enabledMessage: t("User ID salting enabled"),
      disabledMessage: t("User ID salting disabled"),
    },
    {
      id: "blockBots",
      label: t("Block Bot Traffic"),
      description: t("Traffic from known bots and crawlers will not be tracked"),
      value: toggleStates.blockBots,
      key: "blockBots",
      enabledMessage: t("Bot blocking enabled"),
      disabledMessage: t("Bot blocking disabled"),
    },
    {
      id: "trackIp",
      label: t("Track IP Address"),
      description: t("Track the IP address of the user. This is definitely not GDPR compliant!"),
      value: toggleStates.trackIp,
      key: "trackIp",
      enabledMessage: t("IP address tracking enabled"),
      disabledMessage: t("IP address tracking disabled"),
    },
  ];

  const { data: subscription, isLoading: isSubscriptionLoading } = useStripeSubscription();

  const sessionReplayDisabled = (!subscription?.planName.includes("pro") || (!!subscription?.isTrial && (subscription?.eventLimit ?? 0) >= 500_000)) && IS_CLOUD;
  const standardFeaturesDisabled = !subscription?.planName.includes("standard") && !subscription?.planName.includes("pro") && !subscription?.planName.includes("appsumo") && IS_CLOUD;

  // Configuration for analytics feature toggles
  const analyticsToggles: ToggleConfig[] = [
    ...(!subscription?.planName?.startsWith("appsumo") && !isSubscriptionLoading
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
    ...(IS_CLOUD
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
    {
      id: "trackSpaNavigation",
      label: t("SPA Navigation"),
      description: t("Automatically track navigation in single-page applications"),
      value: toggleStates.trackSpaNavigation,
      key: "trackSpaNavigation",
      enabledMessage: t("SPA navigation tracking enabled"),
      disabledMessage: t("SPA navigation tracking disabled"),
    },
    {
      id: "trackUrlParams",
      label: t("URL Parameters"),
      description: t("Include query string parameters in page tracking"),
      value: toggleStates.trackUrlParams,
      key: "trackUrlParams",
      enabledMessage: t("URL parameters tracking enabled"),
      disabledMessage: t("URL parameters tracking disabled"),
    },
    {
      id: "trackInitialPageView",
      label: t("Initial Page View"),
      description: t("Automatically track the first page view when the script loads"),
      value: toggleStates.trackInitialPageView,
      key: "trackInitialPageView",
      enabledMessage: t("Initial page view tracking enabled"),
      disabledMessage: t("Initial page view tracking disabled"),
    },
  ];

  const autoCaptureToggles: ToggleConfig[] = [
    {
      id: "trackOutbound",
      label: t("Outbound Links"),
      description: t("Track when users click on external links"),
      value: toggleStates.trackOutbound,
      key: "trackOutbound",
      enabledMessage: t("Outbound tracking enabled"),
      disabledMessage: t("Outbound tracking disabled"),
    },
    {
      id: "trackErrors",
      label: t("Error Tracking"),
      description: t("Capture JavaScript errors and exceptions from your site"),
      value: toggleStates.trackErrors,
      key: "trackErrors",
      enabledMessage: t("Error tracking enabled"),
      disabledMessage: t("Error tracking disabled"),
      disabled: standardFeaturesDisabled,
      badge: <Badge variant="success">Standard</Badge>,
    },
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
    },
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
    },
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
    },
  ];

  const renderToggleSection = (toggles: ToggleConfig[], title?: string) => (
    <>
      {title && <h4 className="text-sm font-semibold text-foreground">{title}</h4>}
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
    </>
  );

  return (
    <div className="pt-4 pb-6 space-y-6 max-h-[70vh] overflow-y-auto">
      <div className="space-y-4">{renderToggleSection(privacyToggles, t("Privacy & Security"))}</div>
      <div className="space-y-4">{renderToggleSection(analyticsToggles, t("Analytics Features"))}</div>
      <div className="space-y-4">{renderToggleSection(autoCaptureToggles, t("Auto Capture"))}</div>
      <IPExclusionManager siteId={siteMetadata.siteId} disabled={disabled} />
      <CountryExclusionManager siteId={siteMetadata.siteId} disabled={disabled} />
      {IS_CLOUD && <GSCManager disabled={disabled} />}
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{t("Change Domain")}</h4>
          <p className="text-xs text-muted-foreground">{t("Update the domain for this site")}</p>
        </div>
        <div className="flex space-x-2">
          <Input
            value={newDomain}
            onChange={e => setNewDomain(e.target.value.toLowerCase())}
            placeholder="example.com"
          />
          <Button
            variant="outline"
            onClick={handleDomainChange}
            disabled={isChangingDomain || newDomain === siteMetadata.domain || disabled}
          >
            {isChangingDomain ? t("Updating...") : t("Update")}
          </Button>
        </div>
      </div>

      {/* Danger Zone Section */}
      <div className="space-y-3 pt-3">
        <h4 className="text-sm font-semibold text-destructive">{t("Danger Zone")}</h4>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={disabled}>
              <AlertTriangle className="h-4 w-4" />
              {t("Delete Site")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Are you absolutely sure?")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('This action cannot be undone. This will permanently delete the site "{name}" and all of its analytics data.', { name: siteMetadata.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} variant="destructive">
                {isDeleting ? t("Deleting...") : t("Yes, delete site")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
