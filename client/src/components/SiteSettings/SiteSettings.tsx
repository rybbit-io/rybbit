"use client";

import { Settings } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { SiteResponse, useGetSite } from "@/api/admin/sites";
import { useUserOrganizations } from "@/api/admin/organizations";
import { ScriptBuilder } from "./ScriptBuilder";
import { SiteConfiguration } from "./SiteConfiguration";
import { ImportManager } from "./ImportManager";

export function SiteSettings({ siteId, trigger }: { siteId: number; trigger?: React.ReactNode }) {
  const { data: siteMetadata, isLoading, error } = useGetSite(siteId);

  if (isLoading || !siteMetadata || error) {
    return null;
  }

  return <SiteSettingsInner siteMetadata={siteMetadata} trigger={trigger} />;
}

function SiteSettingsInner({ siteMetadata, trigger }: { siteMetadata: SiteResponse; trigger?: React.ReactNode }) {
  const { data: userOrganizationsData } = useUserOrganizations();
  const disabled = !userOrganizationsData?.[0]?.role || userOrganizationsData?.[0]?.role === "member";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");

  if (!siteMetadata) {
    return null;
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[750px]">
        <DialogHeader>
          <DialogTitle>Site Settings</DialogTitle>
          <DialogDescription>Manage settings for {siteMetadata.domain}</DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="pb-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">Site Settings</TabsTrigger>
            <TabsTrigger value="script">Tracking Script</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="script" className="pt-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <ScriptBuilder siteId={siteMetadata.id ?? String(siteMetadata.siteId)} />
          </TabsContent>

          <TabsContent value="import" className="pt-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <ImportManager siteId={siteMetadata.siteId} disabled={disabled} />
          </TabsContent>

          <TabsContent value="settings">
            <SiteConfiguration siteMetadata={siteMetadata} disabled={disabled} onClose={() => setDialogOpen(false)} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
