"use client";
import { Button } from "@/components/ui/button";
import { AlertCircle, AppWindow, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { addSite, useGetSitesFromOrg } from "../../api/admin/sites";
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
import { useStripeSubscription } from "../../lib/subscription/useStripeSubscription";
import { resetStore, useStore } from "../../lib/store";
import { useRouter } from "next/navigation";
import { isValidDomain, normalizeDomain } from "../../lib/utils";

export function AddSite({ trigger, disabled }: { trigger?: React.ReactNode; disabled?: boolean }) {
  const { setSite } = useStore();
  const router = useRouter();

  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: sites, refetch } = useGetSitesFromOrg(activeOrganization?.id);
  const { data: subscription } = useStripeSubscription();

  const isOverSiteLimit = useMemo(() => {
    const numberOfSites = sites?.sites?.length || 0;
    if (!IS_CLOUD) {
      return false;
    }
    if (subscription?.status !== "active" && numberOfSites >= 3) {
      return true;
    }
    if (!subscription?.isPro && numberOfSites >= 10) {
      return true;
    }

    return false;
  }, [subscription, sites]);

  const finalDisabled = disabled || isOverSiteLimit;

  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saltUserIds, setSaltUserIds] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    if (!activeOrganization?.id) {
      setError("Please select an organization");
      return;
    }

    // Validate before attempting to add
    if (!isValidDomain(domain)) {
      setError("Invalid domain format. Must be a valid domain like example.com or sub.example.com");
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

  // Show upgrade message if disabled due to limit
  if (isOverSiteLimit) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button disabled title="Upgrade to Pro to add more websites">
              <Plus className="h-4 w-4" />
              Add Website
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          You have reached the limit of {subscription?.isPro ? 10 : 3} websites. Upgrade to add more websites
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
              Add Website
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AppWindow className="h-6 w-6" />
              Add Website
            </DialogTitle>
            <DialogDescription>Track analytics for a new website in your organization</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="domain" className="text-sm font-medium text-white">
                Domain
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
                <Label htmlFor="isPublic" className="text-sm font-medium text-white">
                  Public Analytics
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  When enabled, anyone can view analytics without logging in
                </p>
              </div>
              <Switch id="isPublic" checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            {/* User ID Salting Setting */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="saltUserIds" className="text-sm font-medium text-white">
                  Enable User ID Salting
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Enhance privacy with daily rotating salts for user IDs
                </p>
              </div>
              <Switch id="saltUserIds" checked={saltUserIds} onCheckedChange={setSaltUserIds} />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Adding Website</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button type="submit" variant={"success"} onClick={handleSubmit} disabled={!domain}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
