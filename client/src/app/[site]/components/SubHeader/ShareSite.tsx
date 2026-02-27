import { Copy, Share } from "lucide-react";
import { useExtracted } from "next-intl";
import { useParams } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import {
  useGeneratePrivateLinkKey,
  useGetPrivateLinkConfig,
  useRevokePrivateLinkKey,
} from "../../../../api/admin/hooks/usePrivateLink";
import { Button } from "../../../../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../../../../components/ui/dropdown-menu";
import { Input } from "../../../../components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";

export function ShareSite() {
  const t = useExtracted();
  const { site } = useParams();
  const { data: privateLink, isLoading: isLoadingPrivateLink } = useGetPrivateLinkConfig(Number(site));
  const { mutate: generatePrivateLinkKey, isPending: isGeneratingPrivateLink } = useGeneratePrivateLinkKey();
  const { mutate: revokePrivateLinkKey } = useRevokePrivateLinkKey();

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" onClick={() => {}} className="h-8 w-8">
              <Share className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("Share a private link")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="flex flex-col p-3 max-w-[400px]">
        <span className="text-sm font-medium pb-2">{t("Share this dashboard")}</span>
        {!isLoadingPrivateLink && !privateLink?.privateLinkKey && (
          <Button onClick={() => generatePrivateLinkKey(Number(site))} disabled={isGeneratingPrivateLink}>
            {isGeneratingPrivateLink ? t("Generating...") : t("Generate Private Link")}
          </Button>
        )}
        {privateLink?.privateLinkKey && (
          <>
            <div className="flex items-center">
              <Input
                value={`${globalThis.location.protocol}//${globalThis.location.host}/${site}/${privateLink?.privateLinkKey}`}
                readOnly
                className="rounded-r-none bg-white dark:bg-neutral-900"
              />
              <Button
                size="icon"
                onClick={() => {
                  const fullUrl = `${globalThis.location.protocol}//${globalThis.location.host}/${site}/${privateLink?.privateLinkKey}`;
                  navigator.clipboard.writeText(fullUrl);
                  toast.success(t("Copied to clipboard"));
                }}
                className="w-10 rounded-l-none"
              >
                <Copy />
              </Button>
            </div>
            <div
              className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-400"
              onClick={() => {
                revokePrivateLinkKey(Number(site));
                toast.success(t("Private link revoked"));
              }}
            >
              {t("Revoke this link")}
            </div>
          </>
        )}
        <span className="text-xs text-neutral-600 dark:text-neutral-300 mt-2">
          {t("Generate a private link to share a read-only view of this dashboard with your team.")}
        </span>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
