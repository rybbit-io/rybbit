"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useCallback, ReactNode } from "react";
import { toast } from "sonner";

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

import { deleteSite, SiteResponse, updateSiteConfig, useGetSitesFromOrg } from "@/api/admin/sites";
import { normalizeDomain } from "@/lib/utils";
import { IPExclusionManager } from "./IPExclusionManager";
import { CountryExclusionManager } from "./CountryExclusionManager";
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
      toast.error("Domain cannot be empty");
      return;
    }

    try {
      setIsChangingDomain(true);
      const normalizedDomain = normalizeDomain(newDomain);
      await updateSiteConfig(siteMetadata.siteId, { domain: normalizedDomain });
      toast.success("Domain updated successfully");
      router.refresh();
      refetch();
    } catch (error) {
      console.error("Error changing domain:", error);
      toast.error("Failed to update domain");
    } finally {
      setIsChangingDomain(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteSite(siteMetadata.siteId);
      toast.success("Site deleted successfully");
      router.push("/");
      onClose?.();
      refetch();
    } catch (error) {
      console.error("Error deleting site:", error);
      toast.error("Failed to delete site");
    } finally {
      setIsDeleting(false);
    }
  };

  // Configuration for privacy & security toggles
  const privacyToggles: ToggleConfig[] = [
    {
      id: "public",
      label: "Public Analytics",
      description: "Anyone can view your site analytics without logging in",
      value: toggleStates.public,
      key: "public",
      enabledMessage: "Site analytics made public",
      disabledMessage: "Site analytics made private",
    },
    {
      id: "saltUserIds",
      label: "User ID Salting",
      description: "User IDs will be salted with a daily rotating key for enhanced privacy",
      value: toggleStates.saltUserIds,
      key: "saltUserIds",
      enabledMessage: "User ID salting enabled",
      disabledMessage: "User ID salting disabled",
    },
    {
      id: "blockBots",
      label: "Block Bot Traffic",
      description: "Traffic from known bots and crawlers will not be tracked",
      value: toggleStates.blockBots,
      key: "blockBots",
      enabledMessage: "Bot blocking enabled",
      disabledMessage: "Bot blocking disabled",
    },
    {
      id: "trackIp",
      label: "Track IP Address",
      description: "Track the IP address of the user. This is definitely not GDPR compliant!",
      value: toggleStates.trackIp,
      key: "trackIp",
      enabledMessage: "IP address tracking enabled",
      disabledMessage: "IP address tracking disabled",
    },
  ];

  const { data: subscription } = useStripeSubscription();

  const sessionReplayDisabled = !subscription?.isPro && IS_CLOUD;
  const webVitalsDisabled = subscription?.status !== "active" && IS_CLOUD;
  const trackErrorsDisabled = subscription?.status !== "active" && IS_CLOUD;

  // Configuration for analytics feature toggles
  const analyticsToggles: ToggleConfig[] = [
    {
      id: "sessionReplay",
      label: "Session Replay",
      description: "Record and replay user sessions to understand user behavior",
      value: toggleStates.sessionReplay,
      key: "sessionReplay",
      enabledMessage: "Session replay enabled",
      disabledMessage: "Session replay disabled",
      disabled: sessionReplayDisabled,
      badge: <Badge variant="success">Pro</Badge>,
    },
    ...(IS_CLOUD
      ? [
          {
            id: "webVitals",
            label: "Web Vitals",
            description: "Track Core Web Vitals metrics (LCP, CLS, INP, FCP, TTFB)",
            value: toggleStates.webVitals,
            key: "webVitals" as keyof SiteResponse,
            enabledMessage: "Web Vitals enabled",
            disabledMessage: "Web Vitals disabled",
            disabled: webVitalsDisabled,
            badge: <Badge variant="success">Standard</Badge>,
          } as ToggleConfig,
        ]
      : []),
    {
      id: "trackErrors",
      label: "Error Tracking",
      description: "Capture JavaScript errors and exceptions from your site",
      value: toggleStates.trackErrors,
      key: "trackErrors",
      enabledMessage: "Error tracking enabled",
      disabledMessage: "Error tracking disabled",
      disabled: trackErrorsDisabled,
      badge: <Badge variant="success">Standard</Badge>,
    },
    {
      id: "trackOutbound",
      label: "Track Outbound Links",
      description: "Track when users click on external links",
      value: toggleStates.trackOutbound,
      key: "trackOutbound",
      enabledMessage: "Outbound tracking enabled",
      disabledMessage: "Outbound tracking disabled",
    },
    {
      id: "trackUrlParams",
      label: "Track URL Parameters",
      description: "Include query string parameters in page tracking",
      value: toggleStates.trackUrlParams,
      key: "trackUrlParams",
      enabledMessage: "URL parameters tracking enabled",
      disabledMessage: "URL parameters tracking disabled",
    },
    {
      id: "trackInitialPageView",
      label: "Track Initial Page View",
      description: "Automatically track the first page view when the script loads",
      value: toggleStates.trackInitialPageView,
      key: "trackInitialPageView",
      enabledMessage: "Initial page view tracking enabled",
      disabledMessage: "Initial page view tracking disabled",
    },
    {
      id: "trackSpaNavigation",
      label: "Track SPA Navigation",
      description: "Automatically track navigation in single-page applications",
      value: toggleStates.trackSpaNavigation,
      key: "trackSpaNavigation",
      enabledMessage: "SPA navigation tracking enabled",
      disabledMessage: "SPA navigation tracking disabled",
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
    <div className="pt-4 space-y-6 max-h-[70vh] overflow-y-auto">
      {/* Privacy & Security Settings */}
      <div className="space-y-4">{renderToggleSection(privacyToggles, "Privacy & Security")}</div>

      {/* Analytics Features */}
      <div className="space-y-4">{renderToggleSection(analyticsToggles, "Analytics Features")}</div>

      {/* IP Exclusions Section */}
      <IPExclusionManager siteId={siteMetadata.siteId} disabled={disabled} />

      {/* Country Exclusions Section */}
      <CountryExclusionManager siteId={siteMetadata.siteId} disabled={disabled} />

      {/* Domain Settings Section */}
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Change Domain</h4>
          <p className="text-xs text-muted-foreground">Update the domain for this site</p>
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
            {isChangingDomain ? "Updating..." : "Update"}
          </Button>
        </div>
      </div>

      {/* Danger Zone Section */}
      <div className="space-y-3 pt-3">
        <h4 className="text-sm font-semibold text-destructive">Danger Zone</h4>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={disabled}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Delete Site
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the site &quot;{siteMetadata.name}&quot; and
                all of its analytics data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} variant="destructive">
                {isDeleting ? "Deleting..." : "Yes, delete site"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
