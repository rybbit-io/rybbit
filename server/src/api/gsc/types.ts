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
    site: string;
  };
  Querystring: {
    start_date: string;
    end_date: string;
    dimension: "query" | "page" | "country" | "device";
  };
}

export interface ConnectGSCRequest {
  Params: {
    site: string;
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
    site: string;
  };
}

export interface GetGSCStatusRequest {
  Params: {
    site: string;
  };
}
