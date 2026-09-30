"use client";

import { LogOut } from "lucide-react";
import { useExtracted } from "next-intl";
import { Button } from "../../../components/ui/button";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { useSignout } from "../../../hooks/useSignout";
import { SettingsPage, SettingsPageHeader } from "../components/Ledger";
import { AccountInner } from "./components/AccountInner";

export default function AccountPage() {
  useSetPageTitle("Account");
  const t = useExtracted();
  const signout = useSignout();

  return (
    <SettingsPage>
      <SettingsPageHeader
        title={t("Account")}
        description={t(
          "Your profile, sign-in and personal API keys. They go with you into every organization you belong to."
        )}
        actions={
          <Button variant="outline" size="sm" onClick={signout}>
            <LogOut />
            {t("Sign out")}
          </Button>
        }
      />
      <AccountInner />
    </SettingsPage>
  );
}
