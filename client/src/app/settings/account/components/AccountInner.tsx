"use client";

import { authClient } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useExtracted } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { useUpdateAccountSettings } from "../../../../api/admin/hooks/useAccountSettings";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Switch } from "../../../../components/ui/switch";
import { validateEmail } from "../../../../lib/auth-utils";
import { IS_CLOUD } from "../../../../lib/const";
import { ApiKeyManager } from "./ApiKeyManager";
import { ChangePassword } from "./ChangePassword";
import { DeleteAccount } from "./DeleteAccount";
import { LanguageSwitcher } from "../../../../components/LanguageSwitcher";
import { useSignout } from "../../../../hooks/useSignout";

export function AccountInner() {
  const session = authClient.useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const signout = useSignout();
  const updateAccountSettings = useUpdateAccountSettings();
  const t = useExtracted();

  const [email, setEmail] = useState(session.data?.user.email ?? "");
  const [name, setName] = useState(session.data?.user.name ?? "");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  useEffect(() => {
    setEmail(session.data?.user.email ?? "");
    setName(session.data?.user.name ?? "");
  }, [session]);

  const handleNameUpdate = async () => {
    if (!name) {
      toast.error(t("Name cannot be empty"));
      return;
    }

    try {
      setIsUpdatingName(true);
      const response = await authClient.updateUser({
        name,
      });

      if (response.error) {
        throw new Error(response.error.message || t("Failed to update name"));
      }

      toast.success(t("Name updated successfully"));
      session.refetch();
    } catch (error) {
      console.error("Error updating name:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to update name"));
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!email) {
      toast.error(t("Email cannot be empty"));
      return;
    }

    if (!validateEmail(email)) {
      toast.error(t("Please enter a valid email address"));
      return;
    }

    try {
      setIsUpdatingEmail(true);
      const response = await authClient.changeEmail({
        newEmail: email,
      });

      if (response.error) {
        throw new Error(response.error.message || t("Failed to update email"));
      }

      toast.success(t("Email updated successfully"));
      session.refetch();
    } catch (error) {
      console.error("Error updating email:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to update email"));
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleEmailReportsToggle = async (checked: boolean) => {
    try {
      await updateAccountSettings.mutateAsync({
        sendAutoEmailReports: checked,
      });
      toast.success(t("Email reports {status}", { status: checked ? t("enabled") : t("disabled") }));
      session.refetch();
    } catch (error) {
      console.error("Error updating email reports setting:", error);
      toast.error(error instanceof Error ? error.message : t("Failed to update email reports setting"));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-2">
        <CardHeader>
          <CardTitle className="text-xl">{t("Account")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t("Name")}</h4>
            <p className="text-xs text-neutral-500">{t("Update your name displayed across the platform")}</p>
            <div className="flex space-x-2">
              <Input id="name" value={name} onChange={({ target }) => setName(target.value)} placeholder="name" />
              <Button
                variant="outline"
                onClick={handleNameUpdate}
                disabled={isUpdatingName || name === session.data?.user.name}
              >
                {isUpdatingName ? t("Updating...") : t("Update")}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t("Email")}</h4>
            <p className="text-xs text-neutral-500">{t("Update your email address for account notifications")}</p>
            <div className="flex space-x-2">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={({ target }) => setEmail(target.value)}
                placeholder="email@example.com"
              />
              <Button
                variant="outline"
                onClick={handleEmailUpdate}
                disabled={isUpdatingEmail || email === session.data?.user.email}
              >
                {isUpdatingEmail ? t("Updating...") : t("Update")}
              </Button>
            </div>
          </div>
          {(session.data?.user as any)?.sendAutoEmailReports !== undefined && IS_CLOUD && (
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{t("Send Weekly Email Reports")}</h4>
                <p className="text-xs text-neutral-500">{t("Enable or disable automatic email reports for your account.")}</p>
              </div>
              <div className="flex space-x-2">
                <Switch
                  checked={(session.data?.user as any).sendAutoEmailReports}
                  onCheckedChange={handleEmailReportsToggle}
                  disabled={updateAccountSettings.isPending}
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t("Language")}</h4>
            <p className="text-xs text-neutral-500">{t("Select your preferred language")}</p>
            <LanguageSwitcher />
          </div>
          <Button variant="outline" onClick={signout}>
            {t("Sign out")}
          </Button>
        </CardContent>
      </Card>

      <Card className="p-2">
        <CardHeader>
          <CardTitle className="text-xl">{t("Security")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t("Password")}</h4>
            <p className="text-xs text-neutral-500">{t("Change your account password")}</p>
            <div className="w-[200px]">
              <ChangePassword />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-500">{t("Danger Zone")}</h4>
            <p className="text-xs text-neutral-500">{t("Permanently delete your account and all associated data")}</p>
            <div className="w-[200px]">
              <DeleteAccount />
            </div>
          </div>
        </CardContent>
      </Card>
      <ApiKeyManager />
    </div>
  );
}
