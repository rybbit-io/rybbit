"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert } from "../../../../components/ui/alert";
import { BACKEND_URL } from "../../../../lib/const";

interface AddMemberDialogProps {
  organizationId: string;
  onSuccess: () => void;
}

export function AddMemberDialog({
  organizationId,
  onSuccess,
}: AddMemberDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");

  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const handleInvite = async () => {
    if (!email) {
      setError("Email is required");
      return;
    }

    setIsLoading(true);
    try {
      await fetch(`${BACKEND_URL}/add-user-to-organization`, {
        method: "POST",
        body: JSON.stringify({
          email: email,
          role: role,
          organizationId: organizationId,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      toast.success(`Invitation sent to ${email}`);
      setOpen(false);
      onSuccess();
      setEmail("");
      setRole("member");
    } catch (error: any) {
      setError(error.message || "Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-4 w-4 mr-1" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a new member</DialogTitle>
          <DialogDescription>
            Add a new member to this organization.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {/* <SelectItem value="owner">Owner</SelectItem> */}
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <Alert variant="destructive">{error}</Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={isLoading} variant="success">
            {isLoading ? "Adding..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
