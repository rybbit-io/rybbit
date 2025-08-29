"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { OutboundLink } from "../../../../../api/analytics/events/useGetOutboundLinks";
import { OutboundLinksList } from "../../../events/components/OutboundLinksList";

interface OutboundLinksDialogProps {
  outboundLinks: OutboundLink[];
  expanded: boolean;
  close: () => void;
}

export function OutboundLinksDialog({ outboundLinks, expanded, close }: OutboundLinksDialogProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return outboundLinks;
    return outboundLinks.filter((link) => link.url.toLowerCase().includes(search.toLowerCase()));
  }, [outboundLinks, search]);

  return (
    <Dialog open={expanded} onOpenChange={close}>
      <DialogContent className="max-w-[600px] w-[calc(100vw-2rem)] p-2 sm:p-4">
        <DialogHeader>
          <DialogTitle>Outbound Links</DialogTitle>
        </DialogHeader>
        <div className="mb-4">
          <Input
            type="text"
            placeholder={`Filter ${outboundLinks.length} links...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-neutral-900 border-neutral-700 text-xs"
          />
        </div>
        <OutboundLinksList outboundLinks={filtered} isLoading={false} size="large" maxHeight={500} />
      </DialogContent>
    </Dialog>
  );
}
