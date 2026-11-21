import { authedFetch } from "../../utils";

// Handing a site to someone outside its organization. The sender names a
// recipient by email; the recipient opens the emailed link (/transfer/<id>)
// signed in with that address and picks an organization they manage.

/** A site's pending outgoing transfer, as its sender sees it. */
export type SiteTransfer = {
  id: string;
  recipientEmail: string;
  createdAt: string;
  expiresAt: string;
  /** The link the recipient was emailed, for the sender to pass on themselves. */
  url: string;
};

/** What the recipient is being offered. */
export type IncomingSiteTransfer = {
  id: string;
  site: { siteId: number; name: string; domain: string };
  sourceOrganizationId: string;
  sourceOrganizationName: string;
  /** The sender's email address; null when their account is gone. */
  sentBy: string | null;
  expiresAt: string;
};

export function fetchSiteTransfer(siteId: number) {
  return authedFetch<{ transfer: SiteTransfer | null }>(`/sites/${siteId}/transfer`);
}

/** Starts the site's transfer, replacing (and so revoking) any pending one. */
export function createSiteTransfer(siteId: number, email: string) {
  return authedFetch<SiteTransfer>(`/sites/${siteId}/transfer`, undefined, {
    method: "POST",
    data: { email },
  });
}

export function cancelSiteTransfer(siteId: number) {
  return authedFetch<{ success: boolean }>(`/sites/${siteId}/transfer`, undefined, { method: "DELETE" });
}

/**
 * The transfer behind a /transfer/<id> link. Fails with an ApiError: 403 (with
 * `recipientEmail` in its body) when signed in as someone else, 404 when the
 * link is invalid or expired.
 */
export function fetchIncomingSiteTransfer(transferId: string) {
  return authedFetch<IncomingSiteTransfer>(`/site-transfers/${encodeURIComponent(transferId)}`);
}

/** Moves the site into one of the recipient's organizations. */
export function acceptSiteTransfer(transferId: string, organizationId: string) {
  return authedFetch<{ success: boolean; siteId: number; organizationId: string }>(
    `/site-transfers/${encodeURIComponent(transferId)}/accept`,
    undefined,
    { method: "POST", data: { organizationId } }
  );
}

export function declineSiteTransfer(transferId: string) {
  return authedFetch<{ success: boolean }>(`/site-transfers/${encodeURIComponent(transferId)}/decline`, undefined, {
    method: "POST",
  });
}
