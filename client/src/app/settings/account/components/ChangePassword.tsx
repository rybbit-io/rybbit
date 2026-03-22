"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, KeyRound, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { useExtracted } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Button } from "../../../../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { authClient } from "../../../../lib/auth";

export function ChangePassword() {
  const t = useExtracted();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState("");

  // Check if passwords match
  const passwordsMatch = newPassword === confirmPassword;

  // Calculate password strength
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength(0);
      setPasswordFeedback("");
      return;
    }

    let strength = 0;
    let feedback = "";

    // Length check
    if (newPassword.length >= 8) {
      strength += 1;
    } else {
      feedback = t("Password should be at least 8 characters");
    }

    // Complexity checks
    if (/[A-Z]/.test(newPassword)) strength += 1;
    if (/[a-z]/.test(newPassword)) strength += 1;
    if (/[0-9]/.test(newPassword)) strength += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength += 1;

    if (strength >= 4 && newPassword.length >= 8) {
      feedback = t("Strong password");
    } else if (strength >= 3 && newPassword.length >= 8) {
      feedback = t("Good password");
    } else if (newPassword.length >= 8) {
      feedback = t("Add uppercase, lowercase, numbers, or symbols for a stronger password");
    }

    setPasswordStrength(strength);
    setPasswordFeedback(feedback);
  }, [newPassword]);

  const canSubmit = currentPassword && newPassword && confirmPassword && passwordsMatch && passwordStrength >= 3;

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsSubmitting(false);
    setPasswordStrength(0);
    setPasswordFeedback("");
  };

  const handleSubmit = async () => {
    if (!passwordsMatch) {
      toast.error(t("New password and confirm password do not match"));
      return;
    }

    if (passwordStrength < 3) {
      toast.error(t("Please use a stronger password"));
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await authClient.changePassword({
        currentPassword,
        newPassword,
      });

      if (response.error) {
        toast.error(`Error: ${response.error.message}`);
        return;
      }

      toast.success(t("Password changed successfully"));
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(`Error: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get color based on password strength
  const getStrengthColor = () => {
    if (passwordStrength === 0) return "bg-neutral-200 dark:bg-neutral-700";
    if (passwordStrength <= 2) return "bg-red-500";
    if (passwordStrength === 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <KeyRound className="h-4 w-4 mr-2" />
          {t("Change Password")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("Change Password")}</DialogTitle>
          <DialogDescription>{t("Update your password to keep your account secure")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-sm font-medium flex items-center">
              {t("Current Password")}
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                type="password"
                placeholder={t("Your current password")}
                className="pr-10"
              />
              {currentPassword && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium flex items-center justify-between">
              <span>{t("New Password")}</span>
              {passwordStrength > 0 && (
                <span
                  className={cn(
                    "text-xs",
                    passwordStrength <= 2
                      ? "text-red-500"
                      : passwordStrength === 3
                        ? "text-yellow-500"
                        : "text-green-500"
                  )}
                >
                  {passwordStrength <= 2 ? t("Weak") : passwordStrength === 3 ? t("Good") : t("Strong")}
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                type="password"
                placeholder={t("Your new password")}
                className="pr-10"
              />
              {newPassword && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500">
                  {passwordStrength >= 3 ? (
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              )}
            </div>

            {/* Password strength indicator */}
            {newPassword && (
              <>
                <div className="flex space-x-1 mt-1.5">
                  {[1, 2, 3, 4].map(index => (
                    <div
                      key={index}
                      className={cn(
                        "h-1.5 w-1/4 rounded-full transition-colors duration-300",
                        index <= passwordStrength ? getStrengthColor() : "bg-neutral-200 dark:bg-neutral-700"
                      )}
                    />
                  ))}
                </div>
                {passwordFeedback && (
                  <p
                    className={cn(
                      "text-xs mt-1",
                      passwordStrength <= 2
                        ? "text-red-500"
                        : passwordStrength === 3
                          ? "text-yellow-500"
                          : "text-green-500"
                    )}
                  >
                    {passwordFeedback}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium flex items-center">
              {t("Confirm Password")}
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                type="password"
                placeholder={t("Confirm your new password")}
                className="pr-10"
              />
              {confirmPassword && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {passwordsMatch ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {!passwordsMatch && confirmPassword && <p className="text-xs text-red-500 mt-1">{t("Passwords do not match")}</p>}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <DialogClose asChild>
            <Button variant="outline" className="sm:flex-1">
              {t("Cancel")}
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} variant="success" className="sm:flex-1">
            {isSubmitting ? t("Changing...") : t("Change Password")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
