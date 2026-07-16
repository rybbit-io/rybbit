"use client";
import { Button } from "@/components/ui/button";
import { AlertCircle, AppWindow, ChevronRight, Globe2, Plus, Smartphone } from "lucide-react";
import { useExtracted } from "next-intl";
import { useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { addSite } from "../../api/admin/endpoints";
import { useGetSitesFromOrg } from "../../api/admin/hooks/useSites";
import { SettingRow } from "../../components/SiteSettings/SettingsSection";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Switch } from "../../components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { authClient } from "../../lib/auth";
import { IS_CLOUD } from "../../lib/const";
import { resetStore, useStore } from "../../lib/store";
import { planIncludesReplay } from "../../lib/subscription/planUtils";
import { useStripeSubscription } from "../../lib/subscription/useStripeSubscription";
import { isValidDomain, normalizeDomain } from "../../lib/utils";

type SiteType = "web" | "mobile";

const isValidAppIdentifier = (value: string) => /^[A-Za-z0-9][A-Za-z0-9._-]{0,252}$/.test(value);

// Mirrors the server's column defaults so an untouched dialog creates the same
// site as one created before these options existed.
const DEFAULT_TOGGLES = {
  public: false,
  saltUserIds: false,
  blockBots: true,
  sessionReplay: false,
  webVitals: false,
  trackErrors: false,
  trackOutbound: true,
  trackUrlParams: true,
  trackInitialPageView: true,
  trackSpaNavigation: true,
  trackButtonClicks: false,
  trackCopy: false,
  trackFormInteractions: false,
};

type ToggleKey = keyof typeof DEFAULT_TOGGLES;

interface CreateToggle {
  key: ToggleKey;
  label: string;
  description: string;
  badge?: ReactNode;
  disabled?: boolean;
  hidden?: boolean;
}

export function AddSite({ trigger, disabled }: { trigger?: React.ReactNode; disabled?: boolean }) {
  const { setSite } = useStore();
  const router = useRouter();
  const t = useExtracted();

  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: sites, refetch } = useGetSitesFromOrg(activeOrganization?.id);
  const { data: subscription, isLoading: isSubscriptionLoading } = useStripeSubscription();

  const siteLimit = subscription?.siteLimit ?? null;
  const isOverSiteLimit = IS_CLOUD && siteLimit !== null && (sites?.sites?.length || 0) >= siteLimit;

  const finalDisabled = disabled || isOverSiteLimit;

  const [open, setOpen] = useState(false);
  const [siteType, setSiteType] = useState<SiteType>("web");
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [toggles, setToggles] = useState({ ...DEFAULT_TOGGLES });
  const [error, setError] = useState("");

  const isMobile = siteType === "mobile";
  const setToggle = (key: ToggleKey, checked: boolean) => setToggles(prev => ({ ...prev, [key]: checked }));

  const sessionReplayDisabled = !planIncludesReplay(subscription) && IS_CLOUD;
  const standardFeaturesDisabled =
    !subscription?.planName.includes("custom") &&
    !subscription?.planName.includes("standard") &&
    !subscription?.planName.includes("pro") &&
    !subscription?.planName.includes("appsumo") &&
    IS_CLOUD;

  const privacyToggles: CreateToggle[] = [
    {
      key: "public",
      label: t("Public Analytics"),
      description: t("When enabled, anyone can view analytics without logging in"),
    },
    {
      key: "saltUserIds",
      label: t("Enable User ID Salting"),
      description: t("Enhance privacy with daily rotating salts for user IDs"),
    },
    {
      key: "blockBots",
      label: t("Block Bot Traffic"),
      description: t("Traffic from known bots and crawlers will not be tracked"),
    },
  ];

  const analyticsToggles: CreateToggle[] = [
    {
      key: "sessionReplay",
      label: t("Session Replay"),
      description: t("Record and replay user sessions to understand user behavior"),
      badge: <Badge variant="success">Pro</Badge>,
      disabled: sessionReplayDisabled,
      // Hide for AppSumo tiers without replays, matching the Tracking settings tab
      hidden:
        isMobile ||
        isSubscriptionLoading ||
        (subscription?.planName?.startsWith("appsumo") && !planIncludesReplay(subscription)),
    },
    {
      key: "webVitals",
      label: t("Web Vitals"),
      description: t("Track Core Web Vitals metrics (LCP, CLS, INP, FCP, TTFB)"),
      badge: <Badge variant="success">Standard</Badge>,
      disabled: standardFeaturesDisabled,
      hidden: isMobile || !IS_CLOUD,
    },
    {
      key: "trackSpaNavigation",
      label: t("SPA Navigation"),
      description: t("Automatically track navigation in single-page applications"),
      hidden: isMobile,
    },
    {
      key: "trackUrlParams",
      label: t("URL Parameters"),
      description: t("Include query string parameters in page tracking"),
      hidden: isMobile,
    },
    {
      key: "trackInitialPageView",
      label: isMobile ? t("Initial Screen View") : t("Initial Page View"),
      description: isMobile
        ? t("Automatically track the initial screen passed to the React Native SDK")
        : t("Automatically track the first page view when the script loads"),
    },
  ];

  const autoCaptureToggles: CreateToggle[] = [
    {
      key: "trackOutbound",
      label: t("Outbound Links"),
      description: t("Track when users click on external links"),
      hidden: isMobile,
    },
    {
      key: "trackErrors",
      label: t("Error Tracking"),
      description: isMobile
        ? t("Allow error events sent by the React Native SDK")
        : t("Capture JavaScript errors and exceptions from your site"),
      badge: <Badge variant="success">Standard</Badge>,
      disabled: standardFeaturesDisabled,
    },
    {
      key: "trackButtonClicks",
      label: t("Button Clicks"),
      description: t("Automatically track clicks on all buttons"),
      badge: <Badge variant="success">Standard</Badge>,
      disabled: standardFeaturesDisabled,
      hidden: isMobile,
    },
    {
      key: "trackCopy",
      label: t("Copy Events"),
      description: t("Track when users copy text from your site"),
      badge: <Badge variant="success">Standard</Badge>,
      disabled: standardFeaturesDisabled,
      hidden: isMobile,
    },
    {
      key: "trackFormInteractions",
      label: t("Form Interactions"),
      description: t("Automatically track form submissions and input/select changes"),
      badge: <Badge variant="success">Standard</Badge>,
      disabled: standardFeaturesDisabled,
      hidden: isMobile,
    },
  ];

  const handleSubmit = async () => {
    setError("");

    if (!activeOrganization?.id) {
      setError(t("Please select an organization"));
      return;
    }

    // Validate before attempting to add
    if (siteType === "web" && !isValidDomain(domain)) {
      setError(t("Invalid domain format. Must be a valid domain like example.com or sub.example.com"));
      return;
    }
    if (siteType === "mobile" && !isValidAppIdentifier(domain)) {
      setError(t("Invalid app identifier. Use a bundle/package identifier like com.example.app"));
      return;
    }

    try {
      const normalizedDomain = siteType === "web" ? normalizeDomain(domain) : domain.trim();
      const siteName = name.trim() || normalizedDomain;
      const site = await addSite(normalizedDomain, siteName, activeOrganization.id, {
        type: siteType,
        isPublic: toggles.public,
        saltUserIds: toggles.saltUserIds,
        blockBots: toggles.blockBots,
        sessionReplay: isMobile ? undefined : toggles.sessionReplay && !sessionReplayDisabled,
        webVitals: isMobile ? undefined : toggles.webVitals && !standardFeaturesDisabled,
        trackErrors: toggles.trackErrors && !standardFeaturesDisabled,
        trackOutbound: toggles.trackOutbound,
        trackUrlParams: toggles.trackUrlParams,
        trackInitialPageView: toggles.trackInitialPageView,
        trackSpaNavigation: toggles.trackSpaNavigation,
        trackButtonClicks: toggles.trackButtonClicks && !standardFeaturesDisabled,
        trackCopy: toggles.trackCopy && !standardFeaturesDisabled,
        trackFormInteractions: toggles.trackFormInteractions && !standardFeaturesDisabled,
      });

      resetStore();
      setSite(site.siteId.toString());
      router.push(`/${site.siteId}`);
    } catch (error) {
      setError(String(error));
      return;
    }

    setOpen(false);
    refetch();
  };

  const resetForm = () => {
    setSiteType("web");
    setDomain("");
    setName("");
    setError("");
    setShowAdvanced(false);
    setToggles({ ...DEFAULT_TOGGLES });
  };

  const renderToggleGroup = (title: string, groupToggles: CreateToggle[]) => {
    const visible = groupToggles.filter(toggle => !toggle.hidden);
    if (visible.length === 0) {
      return null;
    }
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {visible.map(toggle => (
          <SettingRow
            key={toggle.key}
            label={toggle.label}
            htmlFor={`add-site-${toggle.key}`}
            description={toggle.description}
            badge={IS_CLOUD ? toggle.badge : undefined}
          >
            <Switch
              id={`add-site-${toggle.key}`}
              checked={toggles[toggle.key]}
              disabled={toggle.disabled}
              onCheckedChange={checked => setToggle(toggle.key, checked)}
            />
          </SettingRow>
        ))}
      </div>
    );
  };

  if (subscription?.status !== "active" && subscription?.status !== "trialing" && IS_CLOUD) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {trigger || (
            <Button disabled title={t("Upgrade to Pro to add more websites")}>
              <Plus className="h-4 w-4" />
              {t("Add Site")}
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent>{t("You need to be on an active subscription to add websites")}</TooltipContent>
      </Tooltip>
    );
  }

  // Show upgrade message if disabled due to limit
  if (isOverSiteLimit) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {trigger || (
            <Button disabled title={t("Upgrade to Pro to add more websites")}>
              <Plus className="h-4 w-4" />
              {t("Add Site")}
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent>
          {t("You have reached the limit of {limit} websites. Upgrade to add more websites", {
            limit: String(siteLimit),
          })}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      <Dialog
        open={open}
        onOpenChange={isOpen => {
          setOpen(isOpen);
          if (isOpen) {
            resetForm();
          }
        }}
      >
        <DialogTrigger asChild>
          {trigger || (
            <Button disabled={finalDisabled}>
              <Plus className="h-4 w-4" />
              {t("Add Site")}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AppWindow className="h-6 w-6" />
              {t("Add Site")}
            </DialogTitle>
            <DialogDescription>
              {t("Track analytics for a new website or React Native app in your organization")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <RadioGroup
              value={siteType}
              onValueChange={value => setSiteType(value as SiteType)}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="site-type-web"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800"
              >
                <RadioGroupItem id="site-type-web" value="web" />
                <Globe2 className="h-4 w-4" />
                <span>{t("Website")}</span>
              </Label>
              <Label
                htmlFor="site-type-mobile"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800"
              >
                <RadioGroupItem id="site-type-mobile" value="mobile" />
                <Smartphone className="h-4 w-4" />
                <span>{t("React Native App")}</span>
              </Label>
            </RadioGroup>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="domain" className="text-sm font-medium">
                {siteType === "web" ? t("Domain") : t("App Identifier")}
              </Label>
              <Input
                id="domain"
                value={domain}
                onChange={e => {
                  const value = e.target.value.trim();
                  setDomain(siteType === "web" ? value.toLowerCase() : value);
                }}
                placeholder={siteType === "web" ? "example.com or sub.example.com" : "com.example.app"}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="name" className="text-sm font-medium">
                {t("Name")}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t("Display name (defaults to domain)")}
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                aria-expanded={showAdvanced}
                className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 dark:focus-visible:ring-neutral-300"
              >
                <ChevronRight
                  className={`h-4 w-4 motion-safe:transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                />
                {t("Advanced options")}
              </button>
              {showAdvanced && (
                <div className="mt-3 max-h-[40vh] space-y-5 overflow-y-auto rounded-lg border border-neutral-150 p-4 dark:border-neutral-800">
                  <p className="text-xs text-muted-foreground">
                    {t("You can change any of these later in site settings.")}
                  </p>
                  {renderToggleGroup(t("Privacy & Security"), privacyToggles)}
                  {renderToggleGroup(t("Analytics Features"), analyticsToggles)}
                  {renderToggleGroup(t("Auto Capture"), autoCaptureToggles)}
                </div>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("Error Adding Site")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setOpen(false)} variant="outline">
              {t("Cancel")}
            </Button>
            <Button type="submit" variant={"success"} onClick={handleSubmit} disabled={!domain}>
              {t("Add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
