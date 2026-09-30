"use client";

import type { OrgRole, SiteGrantRole } from "@rybbit/shared";
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
import { authClient } from "@/lib/auth";
import { isAdminRole, siteRolesAbove } from "@/lib/roles";

import { RoleSelect, SiteRoleSelect } from "./RoleSelect";
import { SiteAccessMultiSelect } from "./SiteAccessMultiSelect";

type Member = GetOrganizationMembersResponse["data"][0];

interface EditMemberDialogProps {
  member: Member | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Roles the current user may give, from the server; empty when they can't change roles. */
  assignableRoles: OrgRole[];
}

export function EditMemberDialog({ member, open, onClose, onSuccess, assignableRoles }: EditMemberDialogProps) {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const t = useExtracted();

  // Renaming goes through better-auth's system-admin endpoint, so only system admins may do it.
  const canRename = session?.user.role === "admin";
  const canChangeRole = assignableRoles.length > 0;

  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("member");
  const [restrictSiteAccess, setRestrictSiteAccess] = useState(false);
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);
  const [siteRole, setSiteRole] = useState<SiteGrantRole | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  // A site role only raises the organization role, so only roles above it are offered, and a
  // chosen one the organization role has since caught up with no longer counts.
  const siteRoleOptions = siteRolesAbove(role);
  const effectiveSiteRole = siteRole && siteRoleOptions.includes(siteRole) ? siteRole : null;

  useEffect(() => {
    if (open && member) {
      setName(member.user.name || "");
      setRole(member.role);
      setRestrictSiteAccess(member.siteAccess?.hasRestrictedSiteAccess ?? false);
      setSelectedSiteIds(member.siteAccess?.siteIds ?? []);
      setSiteRole(member.siteAccess?.siteRole ?? null);
      setConfirmRemoveOpen(false);
    }
  }, [open, member]);

  const handleSave = async () => {
    if (!member || !activeOrganization?.id) return;

    if (!isAdminRole(role) && restrictSiteAccess && selectedSiteIds.length === 0) {
      toast.error(t("Please select at least one site or disable site restrictions"));
      return;
    }

    setIsSaving(true);
    try {
      // better-auth reports failures in the result rather than throwing.
      if (canRename && name !== (member.user.name || "")) {
        const { error } = await authClient.admin.updateUser({
          userId: member.userId,
          data: { name },
        });
        if (error) {
          throw new Error(error.message || t("Failed to update member"));
        }
      }

      // The role goes first: if it fails, the member keeps their site restrictions.
      const roleChanged = canChangeRole && role !== member.role;
      if (roleChanged) {
        const { error } = await authClient.organization.updateMemberRole({
          memberId: member.id,
          organizationId: activeOrganization.id,
          role,
        });
        if (error) {
          throw new Error(error.message || t("Failed to update member"));
        }
      }

      if (!isAdminRole(role)) {
        await updateMemberSiteAccess(activeOrganization.id, member.id, {
          hasRestrictedSiteAccess: restrictSiteAccess,
          siteIds: selectedSiteIds,
          siteRole: restrictSiteAccess ? effectiveSiteRole : null,
        });
      } else if (roleChanged && !isAdminRole(member.role) && member.siteAccess?.hasRestrictedSiteAccess) {
        // Promoted to admin or owner: drop the restrictions they no longer need. Admins and owners reach
        // every site whatever is stored, so if the server refuses this, access is already right and the
        // role change still stands; the old list only matters if they are demoted again.
        try {
          await updateMemberSiteAccess(activeOrganization.id, member.id, {
            hasRestrictedSiteAccess: false,
            siteIds: [],
          });
        } catch (error) {
          console.warn("Couldn't clear site restrictions after promotion:", error);
        }
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

  const isRestrictable = !isAdminRole(role);

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

          {canRename && (
            <div className="grid gap-2">
              <Label htmlFor="name">{t("Name")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder={t("Name")}
              />
            </div>
          )}

          {canChangeRole && (
            <div className="grid gap-2">
              <Label htmlFor="role">{t("Role")}</Label>
              <RoleSelect id="role" value={role} roles={assignableRoles} onValueChange={setRole} />
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
                  {siteRoleOptions.length > 0 && (
                    <div className="grid gap-2 mt-4">
                      <Label htmlFor="site-role">{t("Role on these sites")}</Label>
                      <SiteRoleSelect
                        id="site-role"
                        value={effectiveSiteRole}
                        roles={siteRoleOptions}
                        ownRoleLabel={t("Their organization role")}
                        onValueChange={setSiteRole}
                      />
                      <p className="text-xs text-neutral-500 dark:text-neutral-300">
                        {t("Raises their role on the selected sites only.")}
                      </p>
                    </div>
                  )}
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
              {t("Owners and admins automatically have access to all sites.")}
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
