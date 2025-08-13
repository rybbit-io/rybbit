"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
} from "../../../../components/ui/alert-dialog";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { authClient } from "../../../../lib/auth";
import { cn } from "../../../../lib/utils";

export function DeleteAccount() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleAccountDeletion = async () => {
    if (!password) {
      setPasswordError("Password is required to delete your account");
      return;
    }

    try {
      setIsDeleting(true);
      setPasswordError("");
      const response = await authClient.deleteUser({
        password,
      });

      if (response.error) {
        toast.error(`Failed to delete account: ${response.error.message || "Unknown error"}`);
        if (response.error.message && response.error.message.toLowerCase().includes("password")) {
          setPasswordError("Incorrect password");
        }
        return;
      }
      queryClient.clear();
      toast.success("Account successfully deleted");
      setIsOpen(false);
      window.location.reload();
    } catch (error) {
      toast.error(`Failed to delete account: ${error}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setPassword("");
    setPasswordError("");
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full" onClick={() => setIsOpen(true)}>
          Delete Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" color="hsl(var(--red-500))" />
            Delete your account?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your account and remove all your data from our
            servers.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-1">
          <Label htmlFor="password" className="text-sm font-medium">
            Enter your password to confirm
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn("mt-1", passwordError && "border-red-500")}
            disabled={isDeleting}
          />
          {passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleAccountDeletion();
            }}
            variant="destructive"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
