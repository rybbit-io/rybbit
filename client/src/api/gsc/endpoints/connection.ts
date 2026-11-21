import { authedFetch } from "../../utils";

export type GSCConnectionStatus = {
  connected: boolean;
  gscPropertyUrl: string | null;
};

export type GSCConnectResponse = {
  authUrl: string;
};

export type GSCDisconnectResponse = {
  success: boolean;
};

/**
 * Fetch GSC connection status for a site
 * GET /api/sites/:site/gsc/status
 */
export async function fetchGSCConnectionStatus(
  site: string | number
): Promise<GSCConnectionStatus> {
  return authedFetch<GSCConnectionStatus>(`/sites/${site}/gsc/status`);
}

/**
 * Get OAuth URL to connect GSC to a site
 * GET /api/sites/:site/gsc/connect
 */
export async function connectGSC(
  site: string | number
): Promise<GSCConnectResponse> {
  return authedFetch<GSCConnectResponse>(`/sites/${site}/gsc/connect`);
}

/**
 * Disconnect GSC from a site
 * DELETE /api/sites/:site/gsc/disconnect
 */
export async function disconnectGSC(
  site: string | number
): Promise<GSCDisconnectResponse> {
  return authedFetch<GSCDisconnectResponse>(
    `/sites/${site}/gsc/disconnect`,
    undefined,
    {
      method: "DELETE",
    }
  );
}
