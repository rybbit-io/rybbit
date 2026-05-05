"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";

import { GetOrganizationMembersResponse, updateMemberSiteAccess } from "@/api/admin/endpoints/auth";
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

export function EditMemberDialog({
  member,
  open,
  onClose,
  onSuccess,
  isOwner,
}: EditMemberDialogProps) {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const queryClient = useQueryClient();
  const t = useExtracted();

  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("member");
  const [restrictSiteAccess, setRestrictSiteAccess] = useState(false);
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (open && member) {
      setName(member.user.name || "");
      setRole(member.role);
      setRestrictSiteAccess(member.siteAccess?.hasRestrictedSiteAccess ?? false);
      setSelectedSiteIds(member.siteAccess?.siteIds ?? []);
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
      await authClient.organization.removeMember({
        memberIdOrEmail: member.id,
        organizationId: activeOrganization.id,
      });

      toast.success(t("Member removed successfully"));
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || t("Failed to remove member"));
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
                    {t("This member will only have access to the selected sites.")}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-300 pl-6">
                  {t("This member has access to all sites in the organization.")}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-300">
              {role === "owner" ? t("Organization owners") : t("Admins")}{" "}
              {t("automatically have access to all sites.")}
            </p>
          )}

          <div className="pt-4 border-t mt-2">
            <h4 className="text-sm font-medium text-destructive">{t("Remove Member")}</h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-300 mt-1">
              {t("Remove this member from the organization.")}
            </p>
            <Button variant="destructive" size="sm" className="mt-2" onClick={handleRemove} disabled={isRemoving}>
              {isRemoving ? t("Removing...") : t("Remove Member")}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} variant="success">
            {isSaving ? t("Saving...") : t("Save Changes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
