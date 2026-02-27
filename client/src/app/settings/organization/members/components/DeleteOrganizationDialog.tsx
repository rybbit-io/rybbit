"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
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
import { authClient } from "@/lib/auth";
import { useStripeSubscription } from "@/lib/subscription/useStripeSubscription";
import { USER_ORGANIZATIONS_QUERY_KEY } from "../../../../../api/admin/hooks/useOrganizations";
import { Organization } from "../page";

interface DeleteOrganizationDialogProps {
  organization: Organization;
  onSuccess: () => void;
}

export function DeleteOrganizationDialog({ organization, onSuccess }: DeleteOrganizationDialogProps) {
  const { data: subscription } = useStripeSubscription();
  const t = useExtracted();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const queryClient = useQueryClient();

  const hasActiveSubscription =
    subscription?.planName.startsWith("standard") || subscription?.planName.startsWith("pro");

  const handleDelete = async () => {
    if (confirmText !== organization.name) {
      toast.error(t("Please type the organization name to confirm deletion"));
      return;
    }

    setIsDeleting(true);
    try {
      await authClient.organization.delete({
        organizationId: organization.id,
      });

      toast.success(t("Organization deleted successfully"));
      queryClient.invalidateQueries({ queryKey: [USER_ORGANIZATIONS_QUERY_KEY] });
      authClient.organization.setActive({
        organizationId: null,
      });
      setIsOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || t("Failed to delete organization"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setConfirmText("");
  };

  const canDelete = !hasActiveSubscription && confirmText === organization.name && !isDeleting;

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full" onClick={() => setIsOpen(true)}>
          {t("Delete Organization")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" color="hsl(var(--red-500))" />
            {hasActiveSubscription ? t("Cannot delete organization") : t("Delete your organization?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {hasActiveSubscription
              ? t("You have an active subscription. Please cancel your subscription before deleting your organization.")
              : t("This action cannot be undone. This will permanently delete the organization and remove all associated data.")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!hasActiveSubscription && (
          <div className="py-4">
            <p className="text-sm mb-2">
              {t("Please type {name} to confirm.", { name: organization.name })}
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={organization.name}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isDeleting}>
            {t("Cancel")}
          </AlertDialogCancel>
          {!hasActiveSubscription && (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              variant="destructive"
              disabled={!canDelete}
            >
              {isDeleting ? t("Deleting...") : t("Delete Organization")}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
