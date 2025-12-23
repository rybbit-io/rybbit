import { Building, Plus } from "lucide-react";
import { useState } from "react";
import { useUserOrganizations } from "../api/admin/organizations";
import { CreateOrganizationDialog } from "./CreateOrganizationDialog";
import { Button } from "./ui/button";
import { Card, CardDescription, CardTitle } from "./ui/card";

export function NoOrganization({
  message = "You need to create or be added to an organization before you can add a website.",
}: {
  message?: string;
}) {
  const [createOrgDialogOpen, setCreateOrgDialogOpen] = useState(false);
  const { refetch: refetchOrganizations } = useUserOrganizations();

  const handleOrganizationCreated = () => {
    refetchOrganizations();
  };
  return (
    <div className="w-full ">
      <Card className="p-6 flex flex-col items-center text-center w-full">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Building className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="mb-2 text-xl">No Organization</CardTitle>
        <CardDescription className="mb-6">{message}</CardDescription>
        <Button onClick={() => setCreateOrgDialogOpen(true)} className="max-w-xs">
          <Plus className="mr-2 h-4 w-4" />
          Create an Organization
        </Button>
      </Card>
      <CreateOrganizationDialog
        open={createOrgDialogOpen}
        onOpenChange={setCreateOrgDialogOpen}
        onSuccess={handleOrganizationCreated}
      />
    </div>
  );
}
