"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";

import { GetOrganizationMembersResponse, updateMemberSiteAccess } from "@/api/admin/endpoints/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

import { SiteAccessMultiSelect } from "./SiteAccessMultiSelect";

type Member = GetOrganizationMembersResponse["data"][0];

interface MemberSiteAccessDialogProps {
  member: Member | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MemberSiteAccessDialog({
  member,
  open,
  onClose,
  onSuccess,
}: MemberSiteAccessDialogProps) {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const queryClient = useQueryClient();
  const t = useExtracted();

  const [restrictSiteAccess, setRestrictSiteAccess] = useState(false);
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);

  // Initialize form state when dialog opens or member changes
  useEffect(() => {
    if (open && member?.siteAccess) {
      setRestrictSiteAccess(member.siteAccess.hasRestrictedSiteAccess);
      setSelectedSiteIds(member.siteAccess.siteIds);
    }
  }, [open, member]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateMemberSiteAccess(activeOrganization!.id, member!.id, {
        hasRestrictedSiteAccess: restrictSiteAccess,
        siteIds: selectedSiteIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizationMembers"] });
      toast.success(t("Site access updated successfully"));
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || t("Failed to update site access"));
    },
  });

  const handleSave = () => {
    if (!member || !activeOrganization?.id) return;

    if (restrictSiteAccess && selectedSiteIds.length === 0) {
      toast.error(t("Please select at least one site or disable site restrictions"));
      return;
    }

    updateMutation.mutate();
  };

  if (!member) return null;

  const isRestrictable = member.role === "member";

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Site Access for {name}", { name: member.user.name || member.user.email })}</DialogTitle>
          <DialogDescription>
            {isRestrictable
              ? t("Configure which sites this member can access.")
              : t("Admin and owner roles have access to all sites and cannot be restricted.")}
          </DialogDescription>
        </DialogHeader>

        {isRestrictable ? (
          <div className="grid gap-4 py-4">
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
                <p className="text-xs text-muted-foreground mt-2">
                  {t("This member will only have access to the selected sites.")}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground pl-6">
                {t("This member has access to all sites in the organization.")}
              </p>
            )}
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-muted-foreground">
              {member.role === "owner" ? t("Organization owners") : t("Admins")} {t("automatically have access to all sites.")}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          {isRestrictable && (
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t("Saving...") : t("Save Changes")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
