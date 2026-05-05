"use client";

import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";

import { Team } from "@/api/admin/endpoints/teams";
import { useCreateTeam, useUpdateTeam } from "@/api/admin/hooks/useTeams";
import { useOrganizationMembers } from "@/api/admin/hooks/useOrganizationMembers";
import { useGetSitesFromOrg } from "@/api/admin/hooks/useSites";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth";

interface CreateEditTeamDialogProps {
  team?: Team;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateEditTeamDialog({
  team: existingTeam,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: CreateEditTeamDialogProps) {
  const t = useExtracted();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: membersData, isLoading: isLoadingMembers } = useOrganizationMembers(activeOrganization?.id || "");
  const { data: sitesData, isLoading: isLoadingSites } = useGetSitesFromOrg(activeOrganization?.id);

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [name, setName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);

  const isEditing = !!existingTeam;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (existingTeam) {
        setName(existingTeam.name);
        setSelectedMemberIds(existingTeam.members.map((m) => m.userId));
        setSelectedSiteIds(existingTeam.sites.map((s) => s.siteId));
      } else {
        setName("");
        setSelectedMemberIds([]);
        setSelectedSiteIds([]);
      }
    }
  }, [open, existingTeam]);

  const members = membersData?.data || [];
  const sites = sitesData?.sites || [];

  const handleMemberToggle = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSiteToggle = (siteId: number) => {
    setSelectedSiteIds((prev) =>
      prev.includes(siteId)
        ? prev.filter((id) => id !== siteId)
        : [...prev, siteId]
    );
  };

  const handleSelectAllMembers = () => {
    if (selectedMemberIds.length === members.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(members.map((m) => m.userId));
    }
  };

  const handleSelectAllSites = () => {
    if (selectedSiteIds.length === sites.length) {
      setSelectedSiteIds([]);
    } else {
      setSelectedSiteIds(sites.map((s) => s.siteId));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t("Team name is required"));
      return;
    }

    if (!activeOrganization?.id) return;

    try {
      if (isEditing) {
        await updateTeam.mutateAsync({
          organizationId: activeOrganization.id,
          teamId: existingTeam.id,
          data: {
            name: name.trim(),
            memberUserIds: selectedMemberIds,
            siteIds: selectedSiteIds,
          },
        });
        toast.success(t("Team updated successfully"));
      } else {
        await createTeam.mutateAsync({
          organizationId: activeOrganization.id,
          data: {
            name: name.trim(),
            memberUserIds: selectedMemberIds,
            siteIds: selectedSiteIds,
          },
        });
        toast.success(t("Team created successfully"));
      }
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isEditing
            ? t("Failed to update team")
            : t("Failed to create team")
      );
    }
  };

  const isPending = createTeam.isPending || updateTeam.isPending;

  const dialogContent = (
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {isEditing ? t("Edit Team") : t("Create Team")}
        </DialogTitle>
        <DialogDescription>
          {isEditing
            ? t("Update team name, members, and site assignments.")
            : t(
              "Create a new team to group sites and control member access."
            )}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        {/* Team Name */}
        <div className="space-y-2">
          <Label htmlFor="team-name">{t("Team Name")}</Label>
          <Input
            id="team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Enter team name")}
          />
        </div>

        {/* Members */}
        <div className="space-y-2">
          <Label className="font-medium">{t("Members")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("Select which members belong to this team.")}
          </p>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all-members"
                checked={
                  members.length > 0 &&
                  selectedMemberIds.length === members.length
                }
                onCheckedChange={handleSelectAllMembers}
              />
              <Label
                htmlFor="select-all-members"
                className="text-sm font-medium cursor-pointer"
              >
                {t("Select all")} ({members.length})
              </Label>
            </div>
            <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
              {isLoadingMembers ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 p-2.5 animate-pulse">
                    <div className="h-4 w-4 rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="flex-1 flex items-center gap-2">
                      <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
                      <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-700" />
                    </div>
                  </div>
                ))
              ) : members.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  {t("No members in this organization")}
                </div>
              ) : (
                members.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center space-x-3 p-2.5 hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`member-${m.userId}`}
                      checked={selectedMemberIds.includes(m.userId)}
                      onCheckedChange={() => handleMemberToggle(m.userId)}
                    />
                    <Label
                      htmlFor={`member-${m.userId}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      <span className="font-medium">
                        {m.user?.name || m.user?.email}
                      </span>
                      {m.user?.name && (
                        <span className="text-muted-foreground ml-2">
                          {m.user.email}
                        </span>
                      )}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sites */}
        <div className="space-y-2">
          <Label className="font-medium">{t("Sites")}</Label>
          <p className="text-xs text-muted-foreground">
            {t(
              "Select which sites belong to this team. Only team members (and admins/owners) will be able to access these sites."
            )}
          </p>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all-sites"
                checked={
                  sites.length > 0 &&
                  selectedSiteIds.length === sites.length
                }
                onCheckedChange={handleSelectAllSites}
              />
              <Label
                htmlFor="select-all-sites"
                className="text-sm font-medium cursor-pointer"
              >
                {t("Select all")} ({sites.length})
              </Label>
            </div>
            <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
              {isLoadingSites ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 p-2.5 animate-pulse">
                    <div className="h-4 w-4 rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-4 w-36 rounded bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                ))
              ) : sites.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  {t("No sites in this organization")}
                </div>
              ) : (
                sites.map((site) => (
                  <div
                    key={site.siteId}
                    className="flex items-center space-x-3 p-2.5 hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`site-${site.siteId}`}
                      checked={selectedSiteIds.includes(site.siteId)}
                      onCheckedChange={() => handleSiteToggle(site.siteId)}
                    />
                    <Label
                      htmlFor={`site-${site.siteId}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      <span className="font-medium">{site.name}</span>
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>
          {t("Cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={isPending} variant="success">
          {isPending
            ? isEditing
              ? t("Updating...")
              : t("Creating...")
            : isEditing
              ? t("Save Changes")
              : t("Create Team")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {dialogContent}
    </Dialog>
  );
}
