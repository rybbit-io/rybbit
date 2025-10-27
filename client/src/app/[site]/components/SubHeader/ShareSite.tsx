import { Copy, Share, Trash } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import { Input } from "../../../../components/ui/input";
import {
  useGeneratePrivateLinkKey,
  useGetPrivateLinkConfig,
  useRevokePrivateLinkKey,
} from "../../../../api/admin/privateLink";
import { useParams } from "next/navigation";
import { toast } from "sonner";

export function ShareSite() {
  const { site } = useParams();
  const {
    data: privateLink,
    isLoading: isLoadingPrivateLink,
    refetch: refetchPrivateLink,
  } = useGetPrivateLinkConfig(Number(site));
  const { mutate: generatePrivateLinkKey, isPending: isGeneratingPrivateLink } = useGeneratePrivateLinkKey();
  const { mutate: revokePrivateLinkKey } = useRevokePrivateLinkKey();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" onClick={() => {}} className="h-8 w-8">
          <Share />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex flex-col p-3 max-w-[400px]">
        <span className="text-sm font-medium pb-2">Share this dashboard</span>
        {!isLoadingPrivateLink && !privateLink?.privateLinkKey && (
          <Button onClick={() => generatePrivateLinkKey(Number(site))} disabled={isGeneratingPrivateLink}>
            {isGeneratingPrivateLink ? "Generating..." : "Generate Private Link"}
          </Button>
        )}
        {privateLink?.privateLinkKey && (
          <>
            <div className="flex items-center">
              <Input
                value={`${globalThis.location.protocol}//${globalThis.location.host}/${site}/${privateLink?.privateLinkKey}`}
                readOnly
                className="rounded-r-none bg-neutral-900"
              />
              <Button
                size="icon"
                onClick={() => {
                  const fullUrl = `${globalThis.location.protocol}//${globalThis.location.host}/${site}/${privateLink?.privateLinkKey}`;
                  navigator.clipboard.writeText(fullUrl);
                  toast.success("Copied to clipboard");
                }}
                className="w-10 rounded-l-none"
              >
                <Copy />
              </Button>
            </div>
            <div
              className="text-xs text-neutral-500 mt-1 cursor-pointer hover:text-neutral-400"
              onClick={() => {
                revokePrivateLinkKey(Number(site));
                toast.success("Private link revoked");
              }}
            >
              Revoke this link
            </div>
          </>
        )}
        <span className="text-xs text-neutral-300 mt-2">
          Generate a private link to share a read-only view of this dashboard with your team.
        </span>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
