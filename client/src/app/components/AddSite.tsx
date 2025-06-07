"use client";
import { Button } from "@/components/ui/button";
import { AlertCircle, AppWindow, Plus } from "lucide-react";
import { useState } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { authClient } from "../../lib/auth";
import { IS_CLOUD } from "../../lib/const";
import { useStripeSubscription } from "../../lib/subscription/useStripeSubscription";

/**
 * A simple domain validation function:
 * - Ensures at least one dot separator
 * - Allows subdomains (e.g. sub.example.com)
 * - Requires the TLD to be alphabetical (e.g. .com)
 */
function isValidDomain(domain: string): boolean {
  const domainRegex =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

/**
 * Validates a comma-separated list of domains
 */
function isValidDomains(domainsString: string): boolean {
  if (!domainsString.trim()) {
    return false;
  }

  const domains = domainsString.split(",").map((d) => d.trim());
  return (
    domains.length > 0 &&
    domains.every((domain) => domain && isValidDomain(domain))
  );
}

export function AddSite({
  trigger,
  disabled,
}: {
  trigger?: React.ReactNode;
  disabled?: boolean;
}) {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: sites, refetch } = useGetSitesFromOrg(activeOrganization?.id);
  const { data: subscription } = useStripeSubscription();

  // Disable if user is on free plan and has 3+ sites
  const isDisabledDueToLimit =
    subscription?.status !== "active" &&
    (sites?.sites?.length || 0) >= 3 &&
    IS_CLOUD;
  const finalDisabled = disabled || isDisabledDueToLimit;

  const [open, setOpen] = useState(false);
  const [domains, setDomains] = useState("");
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
    if (!isValidDomains(domains)) {
      setError(
        "Invalid domain format. Must be valid domains like example.com or example.com, app.example.com"
      );
      return;
    }

    try {
      // Use the first domain as the site name if no explicit name is provided
      const firstDomain = domains.split(",")[0].trim();
      await addSite(domains, firstDomain, activeOrganization.id, {
        isPublic,
        saltUserIds,
      });
    } catch (error) {
      setError("Failed to add site");
      return;
    }

    setOpen(false);
    refetch();
  };

  const resetForm = () => {
    setDomains("");
    setError("");
    setIsPublic(false);
    setSaltUserIds(false);
  };

  // Show upgrade message if disabled due to limit
  if (isDisabledDueToLimit) {
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
        <TooltipContent>Upgrade to Pro to add more websites</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
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
            <DialogDescription>
              Track analytics for a new website in your organization
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid w-full items-center gap-1.5">
              <Label
                htmlFor="domains"
                className="text-sm font-medium text-white"
              >
                Domains
              </Label>
              <Input
                id="domains"
                value={domains}
                onChange={(e) => setDomains(e.target.value.toLowerCase())}
                placeholder="example.com, app.example.com"
              />
              <p className="text-xs text-muted-foreground">
                Enter one or more domains separated by commas
              </p>
            </div>
            {/* Public Analytics Setting */}
            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="isPublic"
                  className="text-sm font-medium text-white"
                >
                  Public Analytics
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  When enabled, anyone can view analytics without logging in
                </p>
              </div>
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            {/* User ID Salting Setting */}
            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="saltUserIds"
                  className="text-sm font-medium text-white"
                >
                  Enable User ID Salting
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Enhance privacy with daily rotating salts for user IDs
                </p>
              </div>
              <Switch
                id="saltUserIds"
                checked={saltUserIds}
                onCheckedChange={setSaltUserIds}
              />
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
            <Button
              type="button"
              onClick={() => setOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={"success"}
              onClick={handleSubmit}
              disabled={!domains.trim()}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
