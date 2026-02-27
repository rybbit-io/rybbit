"use client";

import { CreditCard, Plus, Users } from "lucide-react";
import { useExtracted } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CreateOrganizationDialog } from "../../../components/CreateOrganizationDialog";
import { OrganizationSelector } from "../../../components/OrganizationSelector";
import { Button } from "../../../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { authClient } from "../../../lib/auth";
import { IS_CLOUD } from "../../../lib/const";

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);

  const t = useExtracted();
  const { data: session } = authClient.useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const currentMember = activeOrg?.members?.find(
    (m) => m.userId === session?.user?.id
  );
  const isMember = currentMember?.role === "member";

  // Determine active tab from pathname
  const activeTab = pathname.includes("/subscription") ? "subscription" : "organization";

  const handleTabChange = (value: string) => {
    if (value === "organization") {
      router.push("/settings/organization/members");
    } else if (value === "subscription") {
      router.push("/settings/organization/subscription");
    }
  };

  return (
    <>
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("Organization Settings")}</h1>
          <p className="text-neutral-500 dark:text-neutral-400">{t("Manage your organization settings and members")}</p>
        </div>

        <div className="flex items-center gap-2">
          <OrganizationSelector />
          <CreateOrganizationDialog
            open={createOrgDialogOpen}
            onOpenChange={setCreateOrgDialogOpen}
            trigger={
              <Button variant="secondary" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            }
          />
        </div>

        {isMember ? (
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 text-center text-neutral-500 dark:text-neutral-400">
            {t("You don't have permission to view organization settings.")}
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="organization" className="flex items-center gap-2">
                  <Users size={16} />
                  {t("Organization")}
                </TabsTrigger>
                {IS_CLOUD && (
                  <TabsTrigger value="subscription" className="flex items-center gap-2">
                    <CreditCard size={16} />
                    {t("Subscription")}
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>

            <div className="mt-6">{children}</div>
          </>
        )}
      </div>
    </>
  );
}
