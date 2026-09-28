"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";

import { GetOrganizationMembersResponse, updateMemberSiteAccess } from "@/api/admin/endpoints/auth";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authClient } from "@/lib/auth";

import { SiteAccessMultiSelect } from "./SiteAccessMultiSelect";

type Member = GetOrganizationMembersResponse["data"][0];

interface EditMemberDialogProps {
  member: Member | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isOwner: boolean;
}

export function EditMemberDialog({ member, open, onClose, onSuccess, isOwner }: EditMemberDialogProps) {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const queryClient = useQueryClient();
  const t = useExtracted();

  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("member");
  const [restrictSiteAccess, setRestrictSiteAccess] = useState(false);
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  useEffect(() => {
    if (open && member) {
      setName(member.user.name || "");
      setRole(member.role);
      setRestrictSiteAccess(member.siteAccess?.hasRestrictedSiteAccess ?? false);
      setSelectedSiteIds(member.siteAccess?.siteIds ?? []);
      setConfirmRemoveOpen(false);
    }
  }, [open, member]);

  const handleSave = async () => {
    if (!member || !activeOrganization?.id) return;

    if (role === "member" && restrictSiteAccess && selectedSiteIds.length === 0) {
      toast.error(t("Please select at least one site or disable site restrictions"));
      return;
    }

    setIsSaving(true);
    try {
      // Update name if changed
      if (name !== (member.user.name || "")) {
        await authClient.admin.updateUser({
          userId: member.userId,
          data: { name },
        });
      }

      // If promoting from member to admin/owner, clear site restrictions first
      // (must happen while still a member, since the API rejects updates for non-members)
      if (member.role === "member" && role !== "member" && member.siteAccess?.hasRestrictedSiteAccess) {
        await updateMemberSiteAccess(activeOrganization.id, member.id, {
          hasRestrictedSiteAccess: false,
          siteIds: [],
        });
      }

      // Update role if changed
      if (role !== member.role && isOwner) {
        await authClient.organization.updateMemberRole({
          memberId: member.id,
          organizationId: activeOrganization.id,
          role: role as "admin" | "member" | "owner",
        });
      }

      // Update site access for members
      if (role === "member") {
        await updateMemberSiteAccess(activeOrganization.id, member.id, {
          hasRestrictedSiteAccess: restrictSiteAccess,
          siteIds: selectedSiteIds,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      toast.success(t("Member updated successfully"));
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || t("Failed to update member"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!member || !activeOrganization?.id) return;

    setIsRemoving(true);
    try {
      // better-auth reports failures in the result rather than throwing.
      const { error } = await authClient.organization.removeMember({
        memberIdOrEmail: member.id,
        organizationId: activeOrganization.id,
      });
      if (error) {
        throw new Error(error.message || t("Failed to remove member"));
      }

      toast.success(t("Member removed successfully"));
      setConfirmRemoveOpen(false);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : t("Failed to remove member"));
    } finally {
      setIsRemoving(false);
    }
  };

  if (!member) return null;

  const isRestrictable = role === "member";

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Edit Member")}</DialogTitle>
          <DialogDescription>
            {t("Edit settings for {name}", { name: member.user.name || member.user.email })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>{t("Email")}</Label>
            <div className="text-sm text-neutral-500 dark:text-neutral-300">{member.user.email}</div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">{t("Name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder={t("Name")}
            />
          </div>

          {isOwner && (
            <div className="grid gap-2">
              <Label htmlFor="role">{t("Role")}</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select a role")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t("Owner")}</SelectItem>
                  <SelectItem value="admin">{t("Admin")}</SelectItem>
                  <SelectItem value="member">{t("Member")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {isRestrictable ? (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="restrict-access"
                  checked={restrictSiteAccess}
                  onCheckedChange={checked => {
                    setRestrictSiteAccess(!!checked);
                    if (!checked) {
                      setSelectedSiteIds([]);
                    }
                  }}
                />
                <Label htmlFor="restrict-access" className="cursor-pointer">
                  {t("Restrict access to specific sites")}
                </Label>
              </div>
              {restrictSiteAccess ? (
                <div className="pl-6">
                  <SiteAccessMultiSelect selectedSiteIds={selectedSiteIds} onChange={setSelectedSiteIds} />
                  <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-2">
                    {member.teams?.length
                      ? t(
                          "This member will have access to the selected sites, plus sites granted through their teams ({teams}).",
                          { teams: member.teams.map(team => team.name).join(", ") }
                        )
                      : t("This member will only have access to the selected sites.")}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-300 pl-6">
                  {member.teams?.length
                    ? t(
                        "This member has access to sites granted through their teams ({teams}), plus any site not assigned to a team.",
                        { teams: member.teams.map(team => team.name).join(", ") }
                      )
                    : t("This member has access to all sites in the organization.")}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-300">
              {role === "owner" ? t("Organization owners") : t("Admins")} {t("automatically have access to all sites.")}
            </p>
          )}

          <div className="pt-4 border-t mt-2">
            <h4 className="text-sm font-medium text-destructive">{t("Remove Member")}</h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-1">
              {t("Remove this member from the organization.")}
            </p>
            <AlertDialog
              open={confirmRemoveOpen}
              onOpenChange={next => {
                if (!isRemoving) setConfirmRemoveOpen(next);
              }}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="mt-2">
                  {t("Remove Member")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Remove this member?")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("{name} will immediately lose access to this organization's sites and data.", {
                      name: member.user.name || member.user.email,
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isRemoving}>{t("Cancel")}</AlertDialogCancel>
                  {/* A plain Button, not AlertDialogAction, so the dialog stays open until the request settles
                      (handleRemove closes it on success). `loading` keeps its width while pending. */}
                  <Button
                    variant="destructive"
                    loading={isRemoving}
                    loadingLabel={t("Removing...")}
                    onClick={handleRemove}
                  >
                    {t("Remove member")}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSave} loading={isSaving} loadingLabel={t("Saving...")} variant="success">
            {t("Save Changes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
