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

interface GeneralTabProps {
  siteMetadata: SiteResponse;
  disabled?: boolean;
  onClose?: () => void;
  onPublicChange?: (checked: boolean) => void;
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

export function GeneralTab({ siteMetadata, disabled = false, onClose, onPublicChange }: GeneralTabProps) {
  const t = useExtracted();
  const { refetch } = useGetSitesFromOrg(siteMetadata?.organizationId ?? "");
  const router = useRouter();
  const isMobileSite = siteMetadata.type === "mobile";
  const identifierLabel = isMobileSite ? t("App Identifier") : t("Domain");

  const [newName, setNewName] = useState(siteMetadata.name);
  const [isChangingName, setIsChangingName] = useState(false);
  const [newDomain, setNewDomain] = useState(siteMetadata.domain);
  const [isChangingDomain, setIsChangingDomain] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [toggleStates, setToggleStates] = useState({
    public: siteMetadata.public || false,
    saltUserIds: siteMetadata.saltUserIds || false,
    blockBots: siteMetadata.blockBots || false,
    trackIp: siteMetadata.trackIp ?? false,
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
        if (key === "public") {
          onPublicChange?.(checked);
        }
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
    [siteMetadata.siteId, refetch, onPublicChange]
  );

  const handleNameChange = async () => {
    if (!newName.trim()) {
      toast.error(t("Name cannot be empty"));
      return;
    }

    try {
      setIsChangingName(true);
      await updateSiteConfig(siteMetadata.siteId, { name: newName.trim() });
      toast.success(t("Name updated successfully"));
      router.refresh();
      refetch();
    } catch (error) {
      console.error("Error changing name:", error);
      toast.error(t("Failed to update name"));
    } finally {
      setIsChangingName(false);
    }
  };

  const handleDomainChange = async () => {
    if (!newDomain) {
      toast.error(isMobileSite ? t("App identifier cannot be empty") : t("Domain cannot be empty"));
      return;
    }

    try {
      setIsChangingDomain(true);
      const normalizedDomain = isMobileSite ? newDomain.trim() : normalizeDomain(newDomain);
      await updateSiteConfig(siteMetadata.siteId, { domain: normalizedDomain });
      toast.success(isMobileSite ? t("App identifier updated successfully") : t("Domain updated successfully"));
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

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{t("Site Name")}</h4>
          <p className="text-xs text-muted-foreground">{t("The display name for this site")}</p>
        </div>
        <div className="flex space-x-2">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="My Website" />
          <Button
            variant="outline"
            onClick={handleNameChange}
            disabled={isChangingName || newName === siteMetadata.name || disabled}
          >
            {isChangingName ? t("Updating...") : t("Update")}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{identifierLabel}</h4>
          <p className="text-xs text-muted-foreground">
            {isMobileSite ? t("The bundle or package identifier used for tracking") : t("The domain used for tracking")}
          </p>
        </div>
        <div className="flex space-x-2">
          <Input
            value={newDomain}
            onChange={e => {
              const value = e.target.value.trim();
              setNewDomain(isMobileSite ? value : value.toLowerCase());
            }}
            placeholder={isMobileSite ? "com.example.app" : "example.com"}
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

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground">{t("Privacy & Security")}</h4>
        {privacyToggles.map(toggle => (
          <div key={toggle.id} className="flex items-center justify-between">
            <div>
              <Label htmlFor={toggle.id} className="text-sm font-medium text-foreground flex items-center gap-2">
                {toggle.label}
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
                {t(
                  'This action cannot be undone. This will permanently delete the site "{siteName}" and all of its analytics data.',
                  { siteName: siteMetadata.name }
                )}
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
