"use client";

import { CreditCard, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CreateOrganizationDialog } from "../../../components/CreateOrganizationDialog";
import { OrganizationSelector } from "../../../components/OrganizationSelector";
import { Button } from "../../../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { IS_CLOUD } from "../../../lib/const";

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);

  // Determine active tab from pathname
  const activeTab = pathname.includes("/subscription") ? "subscription" : "members";

  const handleTabChange = (value: string) => {
    if (value === "members") {
      router.push("/settings/organization/members");
    } else if (value === "subscription") {
      router.push("/settings/organization/subscription");
    }
  };

  return (
    <>
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your organization settings and members</p>
        </div>

        <div className="flex items-center gap-2">
          <OrganizationSelector />
          <CreateOrganizationDialog
            open={createOrgDialogOpen}
            onOpenChange={setCreateOrgDialogOpen}
            trigger={<Button>New Organization</Button>}
          />
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users size={16} />
              Members
            </TabsTrigger>
            {IS_CLOUD && (
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <CreditCard size={16} />
                Subscription
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        <div className="mt-6">{children}</div>
      </div>
    </>
  );
}
