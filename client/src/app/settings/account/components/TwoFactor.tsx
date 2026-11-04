"use client";

import { useQuery } from "@tanstack/react-query";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { Skeleton } from "../../../../components/ui/skeleton";
import { authClient } from "../../../../lib/auth";
import { TwoFactorSetup } from "./TwoFactorSetup";
import { BackupCodes, PasswordForm } from "./TwoFactorShared";

const MUTED = "text-neutral-500 dark:text-neutral-400";

/**
 * The two-factor row of Settings → Account. Two-factor protects password
 * sign-in only; Google and GitHub sign-in rely on the provider's own.
 */
export function TwoFactor() {
  const t = useExtracted();
  const session = authClient.useSession();
  // Returned by the server but not part of the client's inferred session type.
  const user = session.data?.user as { id: string; email: string; twoFactorEnabled?: boolean | null } | undefined;
  const accounts = useQuery({
    queryKey: ["user-accounts", user?.id],
    queryFn: async () => {
      const { data, error } = await authClient.listAccounts();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });
  const [setupOpen, setSetupOpen] = useState(false);

  if (!user || accounts.isLoading) return <Skeleton className="h-9 w-40" />;

  const hasPassword = accounts.data?.some(account => account.providerId === "credential");

  return (
    <>
      {user.twoFactorEnabled ? (
        <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2">
          <Badge variant="success">{t("On")}</Badge>
          <div className="ml-auto flex items-center gap-1.5">
            <NewBackupCodes email={user.email} />
            <TurnOff />
          </div>
        </div>
      ) : hasPassword ? (
        <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2">
          <span className={`text-sm ${MUTED}`}>{t("Off")}</span>
          <Button size="sm" className="ml-auto" onClick={() => setSetupOpen(true)}>
            {t("Turn on")}
          </Button>
        </div>
      ) : (
        <p className={`flex min-h-9 items-center text-sm ${MUTED}`}>
          {t("You sign in with Google or GitHub. Turn on two-factor authentication in that account instead.")}
        </p>
      )}
      <TwoFactorSetup open={setupOpen} onOpenChange={setSetupOpen} email={user.email} />
    </>
  );
}

function TurnOff() {
  const t = useExtracted();
  const [open, setOpen] = useState(false);

  const turnOff = async (password: string) => {
    const { error } = await authClient.twoFactor.disable({ password });
    if (error) return error.message || t("Couldn't turn off two-factor authentication");
    setOpen(false);
    toast.success(t("Two-factor authentication is off"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {t("Turn off")}
      </Button>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("Turn off two-factor authentication?")}</DialogTitle>
          <DialogDescription>
            {t("Signing in will only need your password. Your backup codes and trusted devices stop working.")}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <PasswordForm
            submitLabel={t("Turn off")}
            pendingLabel={t("Turning off...")}
            variant="destructive"
            onSubmit={turnOff}
            onCancel={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewBackupCodes({ email }: { email: string }) {
  const t = useExtracted();
  const [open, setOpen] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [codesSaved, setCodesSaved] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && codes && !codesSaved && !confirmClose) {
      setConfirmClose(true);
      return;
    }
    setOpen(isOpen);
    if (!isOpen) {
      setCodes(null);
      setCodesSaved(false);
      setConfirmClose(false);
    }
  };

  const generate = async (password: string) => {
    const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
    if (error) return error.message || t("Couldn't create new backup codes");
    setCodes(data.backupCodes);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t("New backup codes")}
      </Button>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t("New backup codes")}</DialogTitle>
          <DialogDescription>
            {codes
              ? t("Your old backup codes no longer work. Keep these somewhere safe.")
              : t("This replaces your current backup codes. Enter your password to continue.")}
          </DialogDescription>
        </DialogHeader>
        {codes ? (
          <>
            <BackupCodes
              codes={codes}
              email={email}
              onSaved={() => setCodesSaved(true)}
              showCloseWarning={confirmClose && !codesSaved}
            />
            <DialogFooter>
              <Button variant="success" className="w-full" onClick={() => handleOpenChange(false)}>
                {confirmClose && !codesSaved ? t("Close anyway") : t("Done")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          open && (
            <PasswordForm
              submitLabel={t("Create new codes")}
              pendingLabel={t("Creating...")}
              onSubmit={generate}
              onCancel={() => handleOpenChange(false)}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
