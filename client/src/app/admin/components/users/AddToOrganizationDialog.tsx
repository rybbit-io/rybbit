"use client";

import type { OrgRole } from "@rybbit/shared";

import { RoleSelect } from "@/app/settings/organization/components/RoleSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Alert } from "@/components/ui/alert";
import { useAddUserToOrganization } from "@/api/admin/hooks/useOrganizations";
import { ORG_ROLES } from "@/lib/roles";
import { useExtracted } from "next-intl";
import { RemoteOrganizationCombobox } from "../shared/RemoteOrganizationCombobox";

interface AddToOrganizationDialogProps {
  userEmail: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddToOrganizationDialog({ userEmail, userId, open, onOpenChange }: AddToOrganizationDialogProps) {
  const [organizationId, setOrganizationId] = useState<string>("");
  const [organizationName, setOrganizationName] = useState<string>("");
  const [role, setRole] = useState<OrgRole>("member");
  const [error, setError] = useState("");

  const t = useExtracted();
  const addUserToOrganization = useAddUserToOrganization();

  const resetState = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setError("");
      setOrganizationId("");
      setOrganizationName("");
      setRole("member");
    }
  };

  const handleAdd = async () => {
    if (!organizationId) {
      setError(t("Please select an organization"));
      return;
    }

    try {
      await addUserToOrganization.mutateAsync({
        email: userEmail,
        role,
        organizationId,
      });

      toast.success(t("User added to organization successfully"));
      resetState(false);
    } catch (error: any) {
      setError(error.message || t("Failed to add user to organization"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetState}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Add user to organization")}</DialogTitle>
          <DialogDescription>
            {t("Add {userEmail} to an organization with a specific role.", { userEmail })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="organization">{t("Organization")}</Label>
            <RemoteOrganizationCombobox
              value={organizationId}
              selectedName={organizationName}
              onSelect={organization => {
                setOrganizationId(organization.id);
                setOrganizationName(organization.name);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">{t("Role")}</Label>
            <RoleSelect id="role" value={role} roles={ORG_ROLES} onValueChange={setRole} />
          </div>
          {error && <Alert variant="destructive">{error}</Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => resetState(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleAdd} disabled={addUserToOrganization.isPending} variant="success">
            {addUserToOrganization.isPending ? t("Adding...") : t("Add to Organization")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
