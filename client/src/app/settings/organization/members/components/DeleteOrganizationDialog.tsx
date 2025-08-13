"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DialogContent } from "@/components/ui/dialog";
import { DialogHeader } from "@/components/ui/dialog";
import { DialogTitle } from "@/components/ui/dialog";
import { DialogTrigger } from "@/components/ui/dialog";
import { DialogFooter } from "@/components/ui/dialog";
import { DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Trash } from "lucide-react";
import { authClient } from "@/lib/auth";
import { toast } from "sonner";
import { Organization } from "../page";
import { USER_ORGANIZATIONS_QUERY_KEY } from "../../../../../api/admin/organizations";
import { useQueryClient } from "@tanstack/react-query";

interface DeleteOrganizationDialogProps {
  organization: Organization;
  onSuccess: () => void;
}

export function DeleteOrganizationDialog({ organization, onSuccess }: DeleteOrganizationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (confirmText !== organization.name) {
      toast.error("Please type the organization name to confirm deletion");
      return;
    }

    setIsLoading(true);
    try {
      await authClient.organization.delete({
        organizationId: organization.id,
      });

      toast.success("Organization deleted successfully");
      queryClient.invalidateQueries({ queryKey: [USER_ORGANIZATIONS_QUERY_KEY] });
      authClient.organization.setActive({
        organizationId: null,
      });
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete organization");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          <Trash className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Delete Organization
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the organization and remove all associated data.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p>
            Please type <strong>{organization.name}</strong> to confirm.
          </p>
          <Input
            value={confirmText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmText(e.target.value)}
            placeholder={organization.name}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || confirmText !== organization.name}
          >
            {isLoading ? "Deleting..." : "Delete Organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
