"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Smartphone, Trash2, Upload } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { deleteSite, deleteSiteIcon, moveSite, updateSiteConfig, uploadSiteIcon, SiteResponse } from "@/api/admin/endpoints";
import { useUserOrganizations } from "@/api/admin/hooks/useOrganizations";
import { useGetSitesFromOrg } from "@/api/admin/hooks/useSites";
import { BACKEND_URL } from "@/lib/const";
import { resizeImageToIcon } from "@/lib/imageUtils";
import { isValidDomain, isValidPackageName, normalizeDomain } from "@/lib/utils";

import { SettingRow, SettingsSection, SettingsSections } from "./SettingsSection";

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
  const { data: userOrganizations } = useUserOrganizations();
  const queryClient = useQueryClient();
  const router = useRouter();
  const isMobileSite = siteMetadata.type === "mobile";
  const identifierLabel = isMobileSite ? t("App Identifier") : t("Domain");

  const [newName, setNewName] = useState(siteMetadata.name);
  const [isChangingName, setIsChangingName] = useState(false);
  const [newDomain, setNewDomain] = useState(siteMetadata.domain);
  const [isChangingDomain, setIsChangingDomain] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [targetOrgId, setTargetOrgId] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  const [iconVersion, setIconVersion] = useState(0);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isDeletingIcon, setIsDeletingIcon] = useState(false);
  const isMutatingIcon = isUploadingIcon || isDeletingIcon;

  // Organizations the user can move the site into: those they administer,
  // excluding the site's current organization.
  const moveTargets = (userOrganizations ?? []).filter(
    org => (org.role === "admin" || org.role === "owner") && org.id !== siteMetadata.organizationId
  );

  const [toggleStates, setToggleStates] = useState({
    public: siteMetadata.public || false,
    saltUserIds: siteMetadata.saltUserIds || false,
    blockBots: siteMetadata.blockBots || false,
    firstPartyProxy: siteMetadata.firstPartyProxy || false,
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

    if (isMobileSite) {
      if (!isValidPackageName(newDomain)) {
        toast.error(t("Invalid package name format"));
        return;
      }
    } else if (!isValidDomain(newDomain)) {
      toast.error(t("Invalid domain format"));
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

  const handleMove = async () => {
    if (!targetOrgId) {
      return;
    }

    try {
      setIsMoving(true);
      await moveSite(siteMetadata.siteId, targetOrgId);
      toast.success(t("Site moved successfully"));
      queryClient.invalidateQueries({ queryKey: ["get-sites-from-org"] });
      queryClient.invalidateQueries({ queryKey: ["get-site", siteMetadata.siteId] });
      setTargetOrgId("");
      router.refresh();
      refetch();
    } catch (error) {
      console.error("Error moving site:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to move site"));
    } finally {
      setIsMoving(false);
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
    ...(!isMobileSite
      ? [
          {
            id: "blockBots",
            label: t("Block Bot Traffic"),
            description: t("Traffic from known bots and crawlers will not be tracked"),
            value: toggleStates.blockBots,
            key: "blockBots",
            enabledMessage: t("Bot blocking enabled"),
            disabledMessage: t("Bot blocking disabled"),
          } as ToggleConfig,
        ]
      : []),
    {
      id: "firstPartyProxy",
      label: t("First-Party Proxy"),
      description: t(
        "Enable if tracking requests reach Rybbit through your own proxy or CDN (Cloudflare Worker, CloudFront, nginx). Visitor IPs will be read from forwarded headers instead of the connecting IP."
      ),
      value: toggleStates.firstPartyProxy,
      key: "firstPartyProxy",
      enabledMessage: t("First-party proxy mode enabled"),
      disabledMessage: t("First-party proxy mode disabled"),
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
    <SettingsSections>
      <SettingsSection>
        <div className="space-y-2">
          <div>
            <Label htmlFor="site-name" className="text-sm font-medium text-foreground">
              {t("Site Name")}
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">{t("The display name for this site")}</p>
          </div>
          <div className="flex gap-2">
            <Input id="site-name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="My Website" />
            <Button
              variant="outline"
              onClick={handleNameChange}
              disabled={isChangingName || newName === siteMetadata.name || disabled}
            >
              {isChangingName ? t("Updating...") : t("Update")}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <Label htmlFor="site-domain" className="text-sm font-medium text-foreground">
              {identifierLabel}
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              {isMobileSite
                ? t("The bundle or package identifier used for tracking")
                : t("The domain used for tracking")}
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              id="site-domain"
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
      </SettingsSection>

      {isMobileSite && (
        <SettingsSection title={t("App Icon")}>
          <p className="text-xs text-muted-foreground">
            {t(
              "Displayed as a favicon in the sidebar, site selector, and site cards. Accepts any image format — automatically resized to 128×128 PNG. Max 50 KB."
            )}
          </p>
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <Label className="text-xs text-muted-foreground mb-1 block">{t("Preview")}</Label>
              <div className="relative w-12 h-12">
                <img
                  key={iconVersion}
                  src={`${BACKEND_URL}/sites/${siteMetadata.siteId}/icon?v=${iconVersion}`}
                  alt={t("App Icon")}
                  className="w-12 h-12 rounded-lg border border-border"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                  }}
                  onLoad={e => {
                    (e.target as HTMLImageElement).style.display = "";
                    (e.target as HTMLImageElement).nextElementSibling?.classList.add("hidden");
                  }}
                />
                <div className="hidden w-12 h-12 rounded-lg border border-dashed border-border bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={disabled || isMutatingIcon}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = async e => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    setIsUploadingIcon(true);
                    try {
                      const base64 = await resizeImageToIcon(file);
                      await uploadSiteIcon(siteMetadata.siteId, base64);
                      setIconVersion(v => v + 1);
                      toast.success(t("Icon uploaded"));
                    } catch {
                      toast.error(t("Failed to upload icon"));
                    } finally {
                      setIsUploadingIcon(false);
                    }
                  };
                  input.click();
                }}
              >
                <Upload className="h-4 w-4" />
                {isUploadingIcon ? t("Uploading...") : t("Upload Icon")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={disabled || isMutatingIcon}
                onClick={async () => {
                  setIsDeletingIcon(true);
                  try {
                    await deleteSiteIcon(siteMetadata.siteId);
                    setIconVersion(v => v + 1);
                    toast.success(t("Icon removed"));
                  } catch {
                    toast.error(t("Failed to remove icon"));
                  } finally {
                    setIsDeletingIcon(false);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t("Remove Icon")}
              </Button>
            </div>
          </div>
        </SettingsSection>
      )}

      <SettingsSection title={t("Privacy & Security")}>
        {privacyToggles.map(toggle => (
          <SettingRow key={toggle.id} label={toggle.label} htmlFor={toggle.id} description={toggle.description}>
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
          </SettingRow>
        ))}
      </SettingsSection>

      {!disabled && moveTargets.length > 0 && (
        <SettingsSection
          title={t("Move to Organization")}
          description={t(
            "Transfer this site to another organization you administer. Team and restricted member access for this site will be reset."
          )}
        >
          <div className="flex gap-2">
            <Select value={targetOrgId} onValueChange={setTargetOrgId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t("Select an organization")} />
              </SelectTrigger>
              <SelectContent>
                {moveTargets.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={!targetOrgId || isMoving}>
                  {isMoving ? t("Moving...") : t("Move")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Move this site?")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t(
                      'This will move "{siteName}" to {orgName}. Team and restricted member access for this site will be reset, and members of the current organization may lose access.',
                      {
                        siteName: siteMetadata.name,
                        orgName: moveTargets.find(org => org.id === targetOrgId)?.name ?? "",
                      }
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleMove} disabled={isMoving}>
                    {isMoving ? t("Moving...") : t("Yes, move site")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SettingsSection>
      )}

      <SettingsSection>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 px-4 py-3 dark:border-red-500/25">
          <div>
            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">{t("Danger Zone")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Permanently delete this site and all of its analytics data.")}
            </p>
          </div>
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
      </SettingsSection>
    </SettingsSections>
  );
}
