"use client";

import { StandardPage } from "@/components/StandardPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Sites } from "./components/sites/Sites";
import { Users } from "./components/users/Users";
import { Organizations } from "./components/organizations/Organizations";
import { AdminLayout } from "./components/shared/AdminLayout";
import { Database } from "./components/database/Database";
import { AppSidebar } from "../../components/AppSidebar";

import { usePathname } from "next/navigation";
import { useGetSite } from "../../api/admin/hooks/useSites";
import { Button } from "../../components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";

import { Menu } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Favicon } from "../../components/Favicon";
import { useExtracted } from "next-intl";

function MobileSidebar() {
  const pathname = usePathname();
  const { data: site } = useGetSite(Number(pathname.split("/")[1]));
  const t = useExtracted();

  return (
    <div className="md:hidden flex items-center gap-2">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline">
            <Menu />
          </Button>
        </SheetTrigger>
        <VisuallyHidden>
          <SheetHeader>
            <SheetTitle>{t("Rybbit Sidebar")}</SheetTitle>
          </SheetHeader>
        </VisuallyHidden>
        <SheetContent side="left" className="p-0 w-[40px] flex gap-0" showClose={false}>
          <AppSidebar />
        </SheetContent>
      </Sheet>
      {site && <Favicon domain={site.domain} className="w-6 h-6" />}
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("organizations");
  const t = useExtracted();

  return (
    <div className="flex h-full">
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      <StandardPage showSidebar={false}>
        <div className="mb-2">
          <MobileSidebar />
        </div>
        <AdminLayout>
          <div className="text-2xl font-bold mb-4">{t("Admin Dashboard")}</div>
          <Tabs defaultValue="organizations" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="organizations">Organizations</TabsTrigger>
              <TabsTrigger value="sites">Sites</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="settings">Database</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Users />
            </TabsContent>

            <TabsContent value="organizations">
              <Organizations />
            </TabsContent>

            <TabsContent value="sites">
              <Sites />
            </TabsContent>

            <TabsContent value="settings">
              <Database />
            </TabsContent>
          </Tabs>
        </AdminLayout>
      </StandardPage>
    </div>
  );
}
