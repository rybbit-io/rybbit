import { FastifyRequest } from "fastify";

export interface GSCQueryRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCResponse {
  rows?: GSCQueryRow[];
}

export interface GetGSCDataRequest {
  Params: {
    siteId: string;
  };
  Querystring: {
    start_date: string;
    end_date: string;
    /** Legacy single dimension; rows come back as `{ name, ...metrics }`. */
    dimension?: "query" | "page" | "country" | "device";
    /** Comma-separated query,page,country,device,date (max 3); rows name each key. */
    dimensions?: string;
    /** JSON array of { dimension, operator, expression }. */
    filters?: string;
    search_type?: string;
    data_state?: string;
    row_limit?: string;
    start_row?: string;
  };
}

export interface ConnectGSCRequest {
  Params: {
    siteId: string;
  };
}

export interface GSCCallbackRequest {
  Querystring: {
    code: string;
    state: string; // Contains siteId
    error?: string;
  };
}

export interface DisconnectGSCRequest {
  Params: {
    siteId: string;
  };
}

export interface GetGSCStatusRequest {
  Params: {
    siteId: string;
  };
}
