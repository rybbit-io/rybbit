import { Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useGetSite, useGetSitesFromOrg } from "../../../../api/admin/sites";
import { Favicon } from "../../../../components/Favicon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { authClient } from "../../../../lib/auth";
import { resetStore } from "../../../../lib/store";
import { userStore } from "../../../../lib/userStore";
import { cn } from "../../../../lib/utils";

function SiteSelectorContent() {
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: sites } = useGetSitesFromOrg(activeOrganization?.id);

  const pathname = usePathname();
  const router = useRouter();
  const currentSiteId = Number(pathname.split("/")[1]);

  return (
    <DropdownMenuContent align="start">
      {sites?.sites
        ? sites.sites.map((site) => {
            const isSelected = site.siteId === currentSiteId;
            return (
              <DropdownMenuItem
                key={site.siteId}
                onClick={() => {
                  if (isSelected) return;
                  resetStore();
                  router.push(`/${site.siteId}`);
                }}
                className={cn(
                  "flex items-center justify-between",
                  isSelected && "bg-neutral-800"
                )}
              >
                <div className="flex items-center gap-2">
                  <Favicon domain={site.domains[0]} className="w-4 h-4" />
                  <span>{site.domains[0]}</span>
                </div>
                {isSelected && <Check size={16} />}
              </DropdownMenuItem>
            );
          })
        : Array.from({ length: 3 }).map((_, index) => (
            <DropdownMenuItem
              key={`skeleton-${index}`}
              className="flex items-center justify-between animate-pulse cursor-default"
              onClick={(e) => e.preventDefault()}
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-neutral-700 rounded"></div>
                <div className="h-4 bg-neutral-700 rounded w-32"></div>
              </div>
            </DropdownMenuItem>
          ))}
    </DropdownMenuContent>
  );
}

export function SiteSelector() {
  const pathname = usePathname();

  const { user } = userStore();
  const currentSiteId = Number(pathname.split("/")[1]);
  const { data: site } = useGetSite(currentSiteId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger unstyled>
        {site ? (
          <div className="flex gap-2 border border-neutral-800 rounded-lg py-1.5 px-3 justify-start cursor-pointer hover:bg-neutral-800/50 transition-colors h-[36px]">
            <Favicon domain={site.domains[0]} className="w-5 h-5" />
            <div className="text-white truncate text-sm">{site.domains[0]}</div>
          </div>
        ) : (
          <div className="flex gap-2 border border-neutral-800 rounded-lg py-1.5 px-3 justify-start items-center h-[36px] animate-pulse">
            <div className="w-5 h-5 bg-neutral-800 rounded"></div>
            <div className="h-4 bg-neutral-800 rounded w-24"></div>
          </div>
        )}
      </DropdownMenuTrigger>
      {user && <SiteSelectorContent />}
    </DropdownMenu>
  );
}
