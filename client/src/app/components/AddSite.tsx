"use client";
import { Button } from "@/components/ui/button";
import { AlertCircle, AppWindow, Plus } from "lucide-react";
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
import { useStripeSubscription } from "../../lib/subscription/useStripeSubscription";
import { isValidDomain, normalizeDomain } from "../../lib/utils";

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
  const [isPublic, setIsPublic] = useState(false);
  const [saltUserIds, setSaltUserIds] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    if (!activeOrganization?.id) {
      setError(t("Please select an organization"));
      return;
    }

    // Validate before attempting to add
    if (!isValidDomain(domain)) {
      setError(t("Invalid domain format. Must be a valid domain like example.com or sub.example.com"));
      return;
    }

    try {
      const normalizedDomain = normalizeDomain(domain);
      const site = await addSite(normalizedDomain, normalizedDomain, activeOrganization.id, {
        isPublic,
        saltUserIds,
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
    setDomain("");
    setError("");
    setIsPublic(false);
    setSaltUserIds(false);
  };


  if (subscription?.status !== "active" && IS_CLOUD) {
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
              <AppWindow className="h-6 w-6" />
              {t("Add Website")}
            </DialogTitle>
            <DialogDescription>{t("Track analytics for a new website in your organization")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="domain" className="text-sm font-medium">
                {t("Domain")}
              </Label>
              <Input
                id="domain"
                value={domain}
                onChange={e => setDomain(e.target.value.toLowerCase())}
                placeholder="example.com or sub.example.com"
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
