"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

import {
  changeSiteBlockBots,
  changeSiteDomain,
  changeSitePublic,
  changeSiteSalt,
  deleteSite,
  SiteResponse,
  useGetSitesFromOrg,
} from "@/api/admin/sites";
import { normalizeDomain } from "@/lib/utils";
import { IPExclusionManager } from "./IPExclusionManager";

interface SiteConfigurationProps {
  siteMetadata: SiteResponse;
  disabled?: boolean;
  onClose?: () => void;
}

export function SiteConfiguration({
  siteMetadata,
  disabled = false,
  onClose,
}: SiteConfigurationProps) {
  const { refetch } = useGetSitesFromOrg(siteMetadata?.organizationId ?? "");
  const router = useRouter();

  const [newDomain, setNewDomain] = useState(siteMetadata.domain);
  const [isChangingDomain, setIsChangingDomain] = useState(false);
  const [isPublic, setIsPublic] = useState(siteMetadata.public || false);
  const [isChangingPublic, setIsChangingPublic] = useState(false);
  const [isSalting, setIsSalting] = useState(siteMetadata.saltUserIds || false);
  const [isChangingSalt, setIsChangingSalt] = useState(false);
  const [isBlockingBots, setIsBlockingBots] = useState(
    siteMetadata.blockBots || false
  );
  const [isChangingBlockBots, setIsChangingBlockBots] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDomainChange = async () => {
    if (!newDomain) {
      toast.error("Domain cannot be empty");
      return;
    }

    try {
      setIsChangingDomain(true);
      const normalizedDomain = normalizeDomain(newDomain);
      await changeSiteDomain(siteMetadata.siteId, normalizedDomain);
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

  const handlePublicToggle = async (checked: boolean) => {
    try {
      setIsChangingPublic(true);
      await changeSitePublic(siteMetadata.siteId, checked);
      setIsPublic(checked);
      toast.success(
        checked ? "Site analytics made public" : "Site analytics made private"
      );
      refetch();
    } catch (error) {
      console.error("Error changing public status:", error);
      toast.error("Failed to update public status");
      setIsPublic(!checked); // Revert UI state on error
    } finally {
      setIsChangingPublic(false);
    }
  };

  const handleSaltToggle = async (checked: boolean) => {
    try {
      setIsChangingSalt(true);
      await changeSiteSalt(siteMetadata.siteId, checked);
      setIsSalting(checked);
      toast.success(
        checked ? "User ID salting enabled" : "User ID salting disabled"
      );
      refetch();
    } catch (error) {
      console.error("Error changing salt setting:", error);
      toast.error("Failed to update salting setting");
      setIsSalting(!checked); // Revert UI state on error
    } finally {
      setIsChangingSalt(false);
    }
  };

  const handleBlockBotsToggle = async (checked: boolean) => {
    try {
      setIsChangingBlockBots(true);
      await changeSiteBlockBots(siteMetadata.siteId, checked);
      setIsBlockingBots(checked);
      toast.success(checked ? "Bot blocking enabled" : "Bot blocking disabled");
      refetch();
    } catch (error) {
      console.error("Error changing bot blocking setting:", error);
      toast.error("Failed to update bot blocking setting");
      setIsBlockingBots(!checked); // Revert UI state on error
    } finally {
      setIsChangingBlockBots(false);
    }
  };

  return (
    <div className="pt-4 space-y-6 max-h-[70vh] overflow-y-auto">
      {/* Public Analytics Section */}
      <div className="flex items-center justify-between">
        <div>
          <Label
            htmlFor="publicAnalytics"
            className="text-sm font-medium text-foreground block"
          >
            Public Analytics
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            When enabled, anyone can view your site analytics without logging in
          </p>
        </div>
        <Switch
          id="publicAnalytics"
          checked={isPublic}
          disabled={isChangingPublic || disabled}
          onCheckedChange={handlePublicToggle}
        />
      </div>

      {/* User ID Salting Section */}
      <div className="flex items-center justify-between">
        <div>
          <Label
            htmlFor="saltUserIds"
            className="text-sm font-medium text-foreground block"
          >
            Enable User ID Salting
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            When enabled, user IDs will be salted with a daily rotating key for
            enhanced privacy
          </p>
        </div>
        <Switch
          id="saltUserIds"
          checked={isSalting}
          disabled={isChangingSalt || disabled}
          onCheckedChange={handleSaltToggle}
        />
      </div>

      {/* Bot Blocking Section */}
      <div className="flex items-center justify-between">
        <div>
          <Label
            htmlFor="blockBots"
            className="text-sm font-medium text-foreground block"
          >
            Block Bot Traffic
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            When enabled, traffic from known bots and crawlers will not be
            tracked
          </p>
        </div>
        <Switch
          id="blockBots"
          checked={isBlockingBots}
          disabled={isChangingBlockBots || disabled}
          onCheckedChange={handleBlockBotsToggle}
        />
      </div>

      {/* IP Exclusions Section */}
      <IPExclusionManager siteId={siteMetadata.siteId} disabled={disabled} />

      {/* Domain Settings Section */}
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Change Domain
          </h4>
          <p className="text-xs text-muted-foreground">
            Update the domain for this site
          </p>
        </div>
        <div className="flex space-x-2">
          <Input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value.toLowerCase())}
            placeholder="example.com"
          />
          <Button
            variant="outline"
            onClick={handleDomainChange}
            disabled={
              isChangingDomain || newDomain === siteMetadata.domain || disabled
            }
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
            <Button
              variant="destructive"
              className="w-full"
              disabled={disabled}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Delete Site
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                site &quot;{siteMetadata.name}&quot; and all of its analytics
                data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                variant="destructive"
              >
                {isDeleting ? "Deleting..." : "Yes, delete site"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
