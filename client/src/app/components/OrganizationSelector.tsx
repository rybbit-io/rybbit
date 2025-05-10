import { Building2, Check, FunnelPlus, FunnelX } from "lucide-react";
import { useUserOrganizations } from "../../api/admin/organizations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Dispatch, SetStateAction } from "react";
import { useGetSites } from "@/api/admin/sites";

function OrganizationSelectorContent({
  filterOrganizationId,
  setFilterOrganizationId,
}: {
  filterOrganizationId?: string;
  setFilterOrganizationId: Dispatch<SetStateAction<string | undefined>>;
}) {
  const { data: organizations } = useUserOrganizations();
  const { data: sites } = useGetSites();

  return (
    <DropdownMenuContent align="start">
      <DropdownMenuItem
        onClick={() => {
          setFilterOrganizationId(undefined);
        }}
        className={`flex items-center justify-between ${
          !filterOrganizationId ? "bg-neutral-800" : ""
        }`}
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
            className={`flex items-center justify-between ${
              isSelected ? "bg-neutral-800" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>{organization.name} ({siteCount})</span>
            </div>
            {isSelected && <Check size={16} />}
          </DropdownMenuItem>
        );
      })}
    </DropdownMenuContent>
  );
}

export function OrganizationSelector(props: {
  filterOrganizationId?: string;
  setFilterOrganizationId: Dispatch<SetStateAction<string | undefined>>;
}) {
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
