"use client";

import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { authClient } from "../../../lib/auth";
import { AccountInner } from "./components/AccountInner";

export default function AccountPage() {
  useSetPageTitle("Rybbit · Account");
  const session = authClient.useSession();

  return (
    <>
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your personal account settings</p>
      </div>
      <AccountInner session={session} />
    </>
  );
}
