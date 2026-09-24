import { Check, ChevronDown, Plus } from "lucide-react";
import { useExtracted } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { useGetSite, useGetSitesFromOrg } from "../../../../api/admin/hooks/useSites";
import { Favicon } from "../../../../components/Favicon";
import { Button } from "../../../../components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "../../../../components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover";
import { authClient } from "../../../../lib/auth";
import { useStore } from "../../../../lib/store";
import { userStore } from "../../../../lib/userStore";
import { cn, formatter } from "../../../../lib/utils";
import { AddSite } from "../../../components/AddSite";
import { useEmbedablePage } from "../../utils";
import { DEMO_HOSTNAME } from "../../../../lib/const";

// Show the search field once the list is long enough to scan slowly.
const SEARCH_THRESHOLD = 10;

type SiteOption = {
  siteId: number;
  name: string;
  domain: string;
  sessions?: number;
};

const rowClass =
  "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors cursor-pointer";

function SiteRow({ site, isSelected }: { site: SiteOption; isSelected: boolean }) {
  const t = useExtracted();
  // Sites named after their own domain shouldn't print the same string twice.
  const showDomain = Boolean(site.domain) && site.domain !== site.name;
  const sessionsLabel =
    site.sessions !== undefined ? t("{count} sessions (24h)", { count: formatter(site.sessions) }) : null;

  return (
    <>
      <Favicon domain={site.domain} className="w-5 h-5 rounded shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-neutral-900 dark:text-white">{site.name}</span>
          {!showDomain && sessionsLabel && (
            <span className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
              {sessionsLabel}
            </span>
          )}
        </div>
        {showDomain && (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">{site.domain}</span>
            {sessionsLabel && (
              <span className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                {sessionsLabel}
              </span>
            )}
          </div>
        )}
      </div>
      {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-500" />}
    </>
  );
}

function SiteSkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2 animate-pulse">
      <div className="w-5 h-5 bg-neutral-200 dark:bg-neutral-800 rounded shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded w-32" />
        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-20" />
      </div>
    </div>
  );
}

function SiteSelectorContent({ onSiteSelect }: { onSiteSelect: () => void }) {
  const t = useExtracted();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const { data: sites } = useGetSitesFromOrg(activeOrganization?.id);
  const embed = useEmbedablePage();

  const pathname = usePathname();
  const router = useRouter();
  const currentSiteId = Number(pathname.split("/")[1]);

  const { user } = userStore();

  if (embed) return null;

  const isDemo = typeof window !== "undefined" && globalThis.location.hostname === DEMO_HOSTNAME;

  if (!isDemo && !user) {
    return null;
  }

  const navigateToSite = (siteId: number) => {
    if (siteId === currentSiteId) {
      onSiteSelect(); // Close popover even if same site
      return;
    }
    const pathSegments = pathname.split("/");
    pathSegments[1] = siteId.toString();
    const newPath = pathSegments.join("/");
    const queryString = window.location.search;
    // Let the layout's useEffect sync the site from the new pathname
    router.push(queryString ? `${newPath}${queryString}` : newPath);
    onSiteSelect(); // Close popover immediately
  };

  const siteOptions: SiteOption[] | undefined = isDemo
    ? [{ siteId: 81, name: "rybbit.com", domain: "rybbit.com" }]
    : sites?.sites.map(site => ({
        siteId: site.siteId,
        name: site.name,
        domain: site.domain,
        sessions: site.sessionsLast24Hours,
      }));

  const isLoading = !siteOptions;
  const showSearch = (siteOptions?.length ?? 0) >= SEARCH_THRESHOLD;

  return (
    <PopoverContent align="start" className="w-80 p-0 overflow-hidden">
      {isLoading ? (
        <div className="p-1">
          {Array.from({ length: 3 }).map((_, index) => (
            <SiteSkeletonRow key={`skeleton-${index}`} />
          ))}
        </div>
      ) : showSearch ? (
        <Command defaultValue={String(currentSiteId)} className="bg-transparent">
          <CommandInput autoFocus placeholder={t("Search sites...")} />
          <CommandList className="max-h-80 p-1">
            <CommandEmpty>{t("No sites found")}</CommandEmpty>
            {siteOptions.map(site => {
              const isSelected = site.siteId === currentSiteId;
              return (
                <CommandItem
                  key={site.siteId}
                  value={String(site.siteId)}
                  keywords={[site.name, site.domain]}
                  onSelect={() => navigateToSite(site.siteId)}
                  className={cn(rowClass, "py-2", isSelected && "bg-neutral-50 dark:bg-neutral-800/40")}
                >
                  <SiteRow site={site} isSelected={isSelected} />
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      ) : (
        <div className="max-h-80 overflow-y-auto p-1">
          {siteOptions.map(site => {
            const isSelected = site.siteId === currentSiteId;
            return (
              <button
                key={site.siteId}
                type="button"
                onClick={() => navigateToSite(site.siteId)}
                className={cn(
                  rowClass,
                  "hover:bg-neutral-100 dark:hover:bg-neutral-800/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-700",
                  isSelected && "bg-neutral-50 dark:bg-neutral-800/40"
                )}
              >
                <SiteRow site={site} isSelected={isSelected} />
              </button>
            );
          })}
        </div>
      )}

      {!isDemo && (
        <div className="border-t border-neutral-200 dark:border-neutral-800 p-1">
          <AddSite
            trigger={
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Plus className="h-4 w-4" />
                {t("Add Site")}
              </Button>
            }
          />
        </div>
      )}
    </PopoverContent>
  );
}

function SiteSelectorWrapper() {
  const { site: currentSite } = useStore();
  const { data: site } = useGetSite(currentSite);
  const [open, setOpen] = useState(false);
  const embed = useEmbedablePage();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {site ? (
          <button className="flex gap-2 items-center border border-neutral-200 dark:border-neutral-800 rounded-lg py-1.5 px-3 justify-start cursor-pointer hover:bg-neutral-150 dark:hover:bg-neutral-800/50 data-[state=open]:bg-neutral-150 dark:data-[state=open]:bg-neutral-800/50 transition-colors h-[36px] w-full">
            <Favicon domain={site.domain} className="w-5 h-5" />
            <div className="text-neutral-900 dark:text-white truncate text-sm flex-1 text-left">{site.name}</div>
            {!embed && (
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-neutral-600 dark:text-neutral-400 transition-transform duration-200",
                  open && "rotate-180"
                )}
              />
            )}
          </button>
        ) : (
          <button className="flex gap-2 border border-neutral-200 dark:border-neutral-800 rounded-lg py-1.5 px-3 justify-start items-center h-[36px] w-full animate-pulse">
            <div className="w-5 h-5 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
            <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-24 flex-1"></div>
            {!embed && <ChevronDown className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />}
          </button>
        )}
      </PopoverTrigger>
      <Suspense fallback={null}>
        <SiteSelectorContent onSiteSelect={() => setOpen(false)} />
      </Suspense>
    </Popover>
  );
}

export function SiteSelector() {
  return (
    <Suspense fallback={null}>
      <SiteSelectorWrapper />
    </Suspense>
  );
}
