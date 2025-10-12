"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { DialogContent } from "./ui/dialog";
import { DialogHeader } from "./ui/dialog";
import { DialogTitle } from "./ui/dialog";
import { DialogTrigger } from "./ui/dialog";
import { DialogFooter } from "./ui/dialog";
import { DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { AlertCircle, Building2 } from "lucide-react";
import { authClient } from "../lib/auth";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { USER_ORGANIZATIONS_QUERY_KEY } from "../api/admin/organizations";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function CreateOrganizationDialog({ open, onOpenChange, onSuccess, trigger }: CreateOrganizationDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string>("");
  const queryClient = useQueryClient();

  // Generate slug from name when name changes
  const handleNameChange = (value: string) => {
    setName(value);
    if (value) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      setSlug(generatedSlug);
    }
  };

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      // Create organization
      const { data, error } = await authClient.organization.create({
        name,
        slug,
      });

      queryClient.invalidateQueries({ queryKey: [USER_ORGANIZATIONS_QUERY_KEY] });

      if (error) {
        throw new Error(error.message || "Failed to create organization");
      }

      if (!data?.id) {
        throw new Error("No organization ID returned");
      }

      // Set as active organization
      await authClient.organization.setActive({
        organizationId: data.id,
      });

      return data;
    },
    onSuccess: () => {
      toast.success("Organization created successfully");
      setName("");
      setSlug("");
      setError("");
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      toast.error("Failed to create organization");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !slug) {
      setError("Organization name and slug are required");
      return;
    }

    setError("");
    createOrgMutation.mutate({ name, slug });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Create Your Organization
          </DialogTitle>
          <DialogDescription>Set up your organization to get started with Rybbit</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Acme Inc."
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                required
              />
            </div>

            {/* <div className="space-y-2">
              <Label htmlFor="slug">
                Organization Slug
                <span className="text-xs text-muted-foreground ml-2">
                  (URL identifier)
                </span>
              </Label>
              <Input
                id="slug"
                type="text"
                placeholder="acme-inc"
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(/[^a-z0-9-]/g, "")
                  )
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                This will be used in your URL: rybbit.io/{slug}
              </p>
            </div> */}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="success" disabled={createOrgMutation.isPending || !name || !slug}>
              {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
