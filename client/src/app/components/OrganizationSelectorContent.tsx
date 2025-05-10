import { useUserOrganizations } from "@/api/admin/organizations";
import { useGetSites } from "@/api/admin/sites";
import { cn } from "@/lib/utils";
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@radix-ui/react-dropdown-menu";
import { Building2, Check, FunnelX } from "lucide-react";
import { OrganizationSelectorProps } from "./OrganizationSelector";

export function OrganizationSelectorContent({
  filterOrganizationId,
  setFilterOrganizationId,
}: OrganizationSelectorProps) {
  const { data: organizations } = useUserOrganizations();
  const { data: sites } = useGetSites();

  return (
    <DropdownMenuContent align="start">
      <DropdownMenuItem
        onClick={() => {
          setFilterOrganizationId(undefined);
        }}
        className={cn("flex", "items-center", "justify-between", {
          "bg-neutral-800": !filterOrganizationId,
        })}
      >
        <div className="flex items-center gap-2">
          <FunnelX className="w-4 h-4" />
          <span>Show all</span>
        </div>
        {!filterOrganizationId && <Check size={16} />}
      </DropdownMenuItem>
      {organizations?.map((organization) => {
        const isSelected = organization.id === filterOrganizationId;
        const siteCount = sites?.filter(
          (site) => site.organizationId === organization.id
        ).length;
        return (
          <DropdownMenuItem
            key={organization.id}
            onClick={() => {
              setFilterOrganizationId(organization.id);
            }}
            className={cn("flex", "items-center", "justify-between", {
              "bg-neutral-800": isSelected,
            })}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>
                {organization.name} ({siteCount})
              </span>
            </div>
            {isSelected && <Check size={16} />}
          </DropdownMenuItem>
        );
      })}
    </DropdownMenuContent>
  );
}
