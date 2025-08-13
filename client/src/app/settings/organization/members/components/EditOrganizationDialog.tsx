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
import { Label } from "@/components/ui/label";
import { Edit } from "lucide-react";
import { authClient } from "@/lib/auth";
import { toast } from "sonner";
import { Organization } from "../page";

interface EditOrganizationDialogProps {
  organization: Organization;
  onSuccess: () => void;
}

export function EditOrganizationDialog({
  organization,
  onSuccess,
}: EditOrganizationDialogProps) {
  const [name, setName] = useState(organization.name);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleUpdate = async () => {
    if (!name) {
      toast.error("Organization name is required");
      return;
    }

    setIsLoading(true);
    try {
      // Using the appropriate method and parameters based on Better Auth API
      await authClient.organization.update({
        organizationId: organization.id,
        data: { name },
      });

      toast.success("Organization updated successfully");
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to update organization");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
          <DialogDescription>
            Update the details of your organization.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isLoading} variant="success">
            {isLoading ? "Updating..." : "Update Organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
