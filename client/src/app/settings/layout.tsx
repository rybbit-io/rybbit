"use client";

import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { CreditCard, User, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { StandardPage } from "../../components/StandardPage";
import { IS_CLOUD } from "../../lib/const";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<
    "account" | "settings" | "organizations" | "subscription"
  >("account");

  const pathname = usePathname();

  useEffect(() => {
    setSelectedTab(
      pathname.split("/").pop() as "account" | "organizations" | "subscription"
    );
  }, [pathname]);

  return (
    <StandardPage>
      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6">
        <div className="flex flex-col gap-2">
          <Button
            variant={selectedTab === "account" ? "default" : "ghost"}
            onClick={() => {
              setSelectedTab("account");
              router.push("/settings/account");
            }}
            className="justify-start"
          >
            <User size={16} />
            Account
          </Button>
          <Button
            variant={selectedTab === "organizations" ? "default" : "ghost"}
            onClick={() => {
              setSelectedTab("organizations");
              router.push("/settings/organizations");
            }}
            className="justify-start"
          >
            <Users size={16} />
            Organizations
          </Button>
          {IS_CLOUD && (
            <Button
              variant={selectedTab === "subscription" ? "default" : "ghost"}
              onClick={() => {
                setSelectedTab("subscription");
                router.push("/settings/subscription");
              }}
              className="justify-start"
            >
              <CreditCard size={16} />
              Subscription
            </Button>
          )}
        </div>
        {children}
      </div>
    </StandardPage>
  );
}
