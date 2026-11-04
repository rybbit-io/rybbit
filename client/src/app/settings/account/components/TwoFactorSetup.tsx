"use client";

import { useExtracted } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { CopyButton } from "@/components/interior/copy-button";
import { toast } from "@/components/ui/sonner";
import { Button } from "../../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { authClient } from "../../../../lib/auth";
import { BackupCodes, PasswordForm } from "./TwoFactorShared";

type Step =
  | { name: "password" }
  | { name: "scan"; totpURI: string; backupCodes: string[] }
  | { name: "codes"; backupCodes: string[] };

interface TwoFactorSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
}

/**
 * Turns two-factor on: password, then scan the QR code and confirm with a
 * first code, then save the backup codes.
 *
 * Kept mounted by the parent while open: confirming the first code turns
 * two-factor on and refreshes the session, which switches the parent to its
 * "on" state while this dialog still has the backup codes to show.
 */
export function TwoFactorSetup({ open, onOpenChange, email }: TwoFactorSetupProps) {
  const t = useExtracted();
  const [step, setStep] = useState<Step>({ name: "password" });
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [codesSaved, setCodesSaved] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const close = () => {
    onOpenChange(false);
    setStep({ name: "password" });
    setCode("");
    setCodeError("");
    setCodesSaved(false);
    setConfirmClose(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      onOpenChange(true);
      return;
    }
    // Two-factor is already on at this point; the codes can't be shown again.
    if (step.name === "codes" && !codesSaved && !confirmClose) {
      setConfirmClose(true);
      return;
    }
    close();
  };

  const enable = async (password: string) => {
    const { data, error } = await authClient.twoFactor.enable({ password });
    if (error) return error.message || t("Couldn't turn on two-factor authentication");
    if (data && "totpURI" in data) setStep({ name: "scan", totpURI: data.totpURI, backupCodes: data.backupCodes });
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step.name !== "scan") return;
    setVerifying(true);
    setCodeError("");
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    setVerifying(false);
    if (error) {
      setCodeError(error.message || t("That code didn't work. Try again."));
      return;
    }
    setStep({ name: "codes", backupCodes: step.backupCodes });
  };

  const secret = step.name === "scan" ? (new URL(step.totpURI).searchParams.get("secret") ?? "") : "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {step.name === "codes" ? t("Save your backup codes") : t("Turn on two-factor authentication")}
          </DialogTitle>
          <DialogDescription>
            {step.name === "password" && t("Enter your password to continue.")}
            {step.name === "scan" &&
              t("Scan the QR code with an authenticator app, such as 1Password, Google Authenticator or Authy.")}
            {step.name === "codes" &&
              t(
                "Two-factor authentication is on. If you lose your authenticator app, each of these codes signs you in once. Keep them somewhere safe."
              )}
          </DialogDescription>
        </DialogHeader>

        {step.name === "password" && (
          <PasswordForm
            submitLabel={t("Continue")}
            pendingLabel={t("Checking...")}
            onSubmit={enable}
            onCancel={close}
          />
        )}

        {step.name === "scan" && (
          <form onSubmit={verify} className="space-y-4">
            {/* QR codes need a light background to scan, also in dark mode. */}
            <div className="mx-auto w-fit rounded-lg bg-white p-3">
              <QRCodeSVG
                value={step.totpURI}
                size={176}
                marginSize={0}
                title={t("QR code for your authenticator app")}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {t("Can't scan it? Enter this key instead:")}
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 select-all break-all rounded-lg border border-neutral-100 bg-neutral-50 px-2 py-1.5 font-mono text-xs dark:border-neutral-800 dark:bg-neutral-900">
                  {secret.match(/.{1,4}/g)?.join(" ")}
                </code>
                <CopyButton
                  variant="outline"
                  size="sm"
                  value={secret}
                  label={t("Copy key")}
                  onError={() => toast.error(t("Couldn't copy to clipboard. Select the key and copy it manually."))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="two-factor-setup-code">{t("Code from the app")}</Label>
              <Input
                id="two-factor-setup-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                placeholder="123456"
                required
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                aria-invalid={!!codeError}
              />
              {codeError && (
                <p role="alert" className="text-xs text-red-500 dark:text-red-400">
                  {codeError}
                </p>
              )}
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="sm:flex-1" onClick={close} disabled={verifying}>
                {t("Cancel")}
              </Button>
              <Button
                type="submit"
                variant="success"
                className="sm:flex-1"
                loading={verifying}
                loadingLabel={t("Verifying...")}
                disabled={code.length !== 6}
              >
                {t("Turn on")}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step.name === "codes" && (
          <>
            <BackupCodes
              codes={step.backupCodes}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
