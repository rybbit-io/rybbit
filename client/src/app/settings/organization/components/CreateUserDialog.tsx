"use client";

import type { OrgRole } from "@rybbit/shared";
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
import { UserPlus } from "lucide-react";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Alert } from "../../../../components/ui/alert";
import { validateEmail } from "../../../../lib/auth-utils";
import { useCreateUserInOrganization } from "../../../../api/admin/hooks/useOrganizations";
import { RoleSelect } from "./RoleSelect";

interface CreateUserDialogProps {
  organizationId: string;
  onSuccess: () => void;
  /** Roles the current user may give, from the server. */
  assignableRoles: OrgRole[];
}

export function CreateUserDialog({ organizationId, onSuccess, assignableRoles }: CreateUserDialogProps) {
  const t = useExtracted();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<OrgRole>("member");

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const createUserInOrganization = useCreateUserInOrganization();

  const resetState = (open = false) => {
    setOpen(open);
    setError("");
    setEmail("");
    setName("");
    setPassword("");
    setRole("member");
  };

  const handleInvite = async () => {
    if (!email) {
      setError(t("Email is required"));
      return;
    }

    if (!validateEmail(email)) {
      setError(t("Please enter a valid email address"));
      return;
    }

    if (password.length < 8) {
      setError(t("Password must be at least 8 characters long"));
      return;
    }

    try {
      await createUserInOrganization.mutateAsync({
        email,
        name: name || email,
        password,
        role,
        organizationId,
      });

      toast.success(t("User created successfully"));
      onSuccess();
      resetState();
    } catch (error: any) {
      setError(error.message || t("Failed to create user"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetState}>
      <DialogTrigger asChild>
        <Button size="sm" variant="success">
          <UserPlus />
          {t("Create User")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Create a new user")}</DialogTitle>
          <DialogDescription>{t("Create a new user for this organization.")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{t("Email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">{t("Name")}</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t("Password")}</Label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">{t("Role")}</Label>
            <RoleSelect id="role" value={role} roles={assignableRoles} onValueChange={setRole} />
          </div>
          {error && <Alert variant="destructive">{error}</Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => resetState(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleInvite} disabled={createUserInOrganization.isPending} variant="success">
            {createUserInOrganization.isPending ? t("Creating...") : t("Create User")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
