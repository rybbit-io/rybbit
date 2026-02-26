"use client";
import { Button } from "@/components/ui/button";
import { AlertCircle, AppWindow, Plus, Smartphone } from "lucide-react";
import { DateTime } from "luxon";
import { useExtracted } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addSite } from "../../api/admin/endpoints";
import { useGetSitesFromOrg } from "../../api/admin/hooks/useSites";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
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
import { Switch } from "../../components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { authClient } from "../../lib/auth";
import { IS_CLOUD } from "../../lib/const";
import { resetStore, useStore } from "../../lib/store";
import { SubscriptionData, useStripeSubscription } from "../../lib/subscription/useStripeSubscription";
import { isValidDomain, isValidPackageName, normalizeDomain } from "../../lib/utils";

export function AddSite({ trigger, disabled }: { trigger?: React.ReactNode; disabled?: boolean }) {
  const { setSite } = useStore();
  const router = useRouter();
  const t = useExtracted();

  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: sites, refetch } = useGetSitesFromOrg(activeOrganization?.id);
  const { data: subscription } = useStripeSubscription();

  const siteLimit = subscription?.siteLimit ?? null;
  const isOverSiteLimit = IS_CLOUD && siteLimit !== null && (sites?.sites?.length || 0) >= siteLimit;

  const finalDisabled = disabled || isOverSiteLimit;

  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saltUserIds, setSaltUserIds] = useState(false);
  const [error, setError] = useState("");
  const [siteType, setSiteType] = useState<"web" | "app">("web");

  const handleSubmit = async () => {
    setError("");

    if (!activeOrganization?.id) {
      setError(t("Please select an organization"));
      return;
    }

    if (siteType === "web") {
      if (!isValidDomain(domain)) {
        setError(t("Invalid domain format. Must be a valid domain like example.com or sub.example.com"));
        return;
      }
    } else {
      if (!isValidPackageName(domain)) {
        setError(t("Invalid package name format. Must be like com.example.app"));
        return;
      }
    }

    try {
      const normalizedValue = siteType === "web" ? normalizeDomain(domain) : domain.trim();
      const siteName = name.trim() || normalizedValue;
      const site = await addSite(normalizedValue, siteName, activeOrganization.id, {
        isPublic,
        saltUserIds,
        type: siteType,
      });

      if (iconBase64) {
        try {
          await uploadSiteIcon(site.siteId, iconBase64);
        } catch (iconError) {
          console.warn("Site created but icon upload failed", iconError);
        }
      }

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
    setDomain("");
    setName("");
    setError("");
    setIsPublic(false);
    setSaltUserIds(false);
    setSiteType("web");
  };


  if (subscription?.status !== "active" && subscription?.status !== "trialing" && IS_CLOUD) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {trigger || (
            <Button disabled title={t("Upgrade to Pro to add more websites")}>
              <Plus className="h-4 w-4" />
              {t("Add Website")}
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent>
          {t("You need to be on an active subscription to add websites")}
        </TooltipContent>
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
              {t("Add Website")}
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent>
          {t("You have reached the limit of {limit} websites. Upgrade to add more websites", { limit: String(siteLimit) })}
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
              {t("Add Website")}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {siteType === "web" ? <AppWindow className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
              {siteType === "web" ? t("Add Website") : t("Add App")}
            </DialogTitle>
            <DialogDescription>{t("Track analytics for a new website in your organization")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid w-full items-center gap-1.5">
              <Label className="text-sm font-medium">{t("Platform")}</Label>
              <div className="flex gap-2">
                {([
                  { value: "web" as const, label: t("Web"), icon: AppWindow },
                  { value: "app" as const, label: t("App"), icon: Smartphone },
                ]).map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={siteType === value ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => { setSiteType(value); setDomain(""); setError(""); }}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="domain" className="text-sm font-medium">
                {siteType === "web" ? t("Domain") : t("Package Name")}
              </Label>
              <Input
                id="domain"
                value={domain}
                onChange={e => setDomain(e.target.value.toLowerCase())}
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
            {/* Public Analytics Setting */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isPublic" className="text-sm font-medium">
                  {t("Public Analytics")}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("When enabled, anyone can view analytics without logging in")}
                </p>
              </div>
              <Switch id="isPublic" checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            {/* User ID Salting Setting */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="saltUserIds" className="text-sm font-medium">
                  {t("Enable User ID Salting")}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("Enhance privacy with daily rotating salts for user IDs")}
                </p>
              </div>
              <Switch id="saltUserIds" checked={saltUserIds} onCheckedChange={setSaltUserIds} />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("Error Adding Website")}</AlertTitle>
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
