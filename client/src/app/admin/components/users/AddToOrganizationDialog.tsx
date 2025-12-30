"use client";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { useAddUserToOrganization } from "@/api/admin/organizations";
import { useAdminOrganizations } from "@/api/admin/getAdminOrganizations";
import { cn } from "@/lib/utils";

interface AddToOrganizationDialogProps {
  userEmail: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddToOrganizationDialog({ userEmail, userId, open, onOpenChange }: AddToOrganizationDialogProps) {
  const [organizationId, setOrganizationId] = useState<string>("");
  const [role, setRole] = useState<"admin" | "member" | "owner">("member");
  const [error, setError] = useState("");
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const { data: organizations, isLoading: isLoadingOrgs } = useAdminOrganizations();
  const addUserToOrganization = useAddUserToOrganization();

  const resetState = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setError("");
      setOrganizationId("");
      setRole("member");
    }
  };

  const handleAdd = async () => {
    if (!organizationId) {
      setError("Please select an organization");
      return;
    }

    try {
      await addUserToOrganization.mutateAsync({
        email: userEmail,
        role,
        organizationId,
      });

      toast.success("User added to organization successfully");
      resetState(false);
    } catch (error: any) {
      setError(error.message || "Failed to add user to organization");
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetState}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add user to organization</DialogTitle>
          <DialogDescription>
            Add {userEmail} to an organization with a specific role.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="organization">Organization</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between"
                  disabled={isLoadingOrgs}
                >
                  {organizationId
                    ? organizations?.find(org => org.id === organizationId)?.name
                    : isLoadingOrgs
                      ? "Loading..."
                      : "Select an organization..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command
                  filter={(value, search) => {
                    if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                    return 0;
                  }}
                >
                  <CommandInput placeholder="Search organizations..." />
                  <CommandList>
                    <CommandEmpty>No organization found.</CommandEmpty>
                    <CommandGroup>
                      {organizations?.map(org => (
                        <CommandItem
                          key={org.id}
                          value={`${org.name} ${org.id}`}
                          onSelect={() => {
                            setOrganizationId(org.id);
                            setComboboxOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", organizationId === org.id ? "opacity-100" : "opacity-0")} />
                          {org.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={value => setRole(value as "admin" | "member" | "owner")}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <Alert variant="destructive">{error}</Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => resetState(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={addUserToOrganization.isPending} variant="success">
            {addUserToOrganization.isPending ? "Adding..." : "Add to Organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
