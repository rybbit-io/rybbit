"use client";

import { useExtracted } from "next-intl";
import { useState } from "react";
import { AuthButton } from "@/components/auth/AuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth";

type VerifiedUser = NonNullable<Awaited<ReturnType<typeof authClient.twoFactor.verifyTotp>>["data"]>["user"];

interface TwoFactorStepProps {
  onVerified: (user: VerifiedUser) => void;
  onCancel: () => void;
}

export function TwoFactorStep({ onVerified, onCancel }: TwoFactorStepProps) {
  const t = useExtracted();
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const body = { code: code.trim(), trustDevice };
      const { data, error } = useBackupCode
        ? await authClient.twoFactor.verifyBackupCode(body)
        : await authClient.twoFactor.verifyTotp(body);
      if (error?.code === "INVALID_TWO_FACTOR_COOKIE") {
        setError(t("This sign-in has expired. Go back and sign in again."));
      } else if (error) {
        setError(error.message || t("That code didn't work. Try again."));
      } else if (data?.user) {
        onVerified(data.user);
      }
    } catch (error) {
      setError(String(error));
    }
    setIsLoading(false);
  };

  const switchMethod = () => {
    setUseBackupCode(!useBackupCode);
    setCode("");
    setError("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {useBackupCode
            ? t("Enter one of the backup codes you saved when you turned on two-factor authentication.")
            : t("Enter the 6-digit code from your authenticator app.")}
        </p>

        <div className="grid gap-2">
          <Label htmlFor="two-factor-code">{useBackupCode ? t("Backup code") : t("Authentication code")}</Label>
          <Input
            id="two-factor-code"
            key={useBackupCode ? "backup" : "totp"}
            type="text"
            inputMode={useBackupCode ? "text" : "numeric"}
            autoComplete="one-time-code"
            pattern={useBackupCode ? undefined : "[0-9]{6}"}
            maxLength={useBackupCode ? 32 : undefined}
            placeholder={useBackupCode ? "xxxxx-xxxxx" : "123456"}
            required
            autoFocus
            value={code}
            onChange={e => setCode(useBackupCode ? e.target.value : e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="two-factor-trust-device"
            checked={trustDevice}
            onCheckedChange={checked => setTrustDevice(checked === true)}
          />
          <Label htmlFor="two-factor-trust-device" className="font-normal">
            {t("Trust this device for 30 days")}
          </Label>
        </div>

        <AuthButton isLoading={isLoading} loadingText={t("Verifying...")}>
          {t("Verify")}
        </AuthButton>

        <AuthError error={error} title={t("Couldn't verify the code")} />

        <div className="flex justify-between text-sm">
          <button
            type="button"
            onClick={switchMethod}
            className="text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
          >
            {useBackupCode ? t("Use your authenticator app") : t("Use a backup code")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
          >
            {t("Back to sign in")}
          </button>
        </div>
      </div>
    </form>
  );
}
