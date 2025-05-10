import { Building2, FunnelPlus } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { useUserOrganizations } from "../../api/admin/organizations";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { OrganizationSelectorContent } from "./OrganizationSelectorContent";

export type OrganizationSelectorProps = {
  filterOrganizationId?: string;
  setFilterOrganizationId: Dispatch<SetStateAction<string | undefined>>;
};

export function OrganizationSelector(props: OrganizationSelectorProps) {
  const { data: organizations, isLoading: isLoadingOrganizations } =
    useUserOrganizations();

  const organization = organizations?.find(
    (org) => org.id === props.filterOrganizationId
  );

  if (isLoadingOrganizations || !organizations || organizations.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger unstyled>
        <div className="flex gap-2 border border-neutral-800 rounded-lg py-1.5 px-3 justify-start cursor-pointer hover:bg-neutral-800/50 transition-colors h-[36px]">
          {organization ? (
            <Building2 className="w-5 h-5" />
          ) : (
            <FunnelPlus className="w-5 h-5" />
          )}
          <div className="text-white truncate text-sm">
            {organization?.name ?? "Filter by organization"}
          </div>
        </div>
      </DropdownMenuTrigger>
      <OrganizationSelectorContent {...props} />
    </DropdownMenu>
  );
}
