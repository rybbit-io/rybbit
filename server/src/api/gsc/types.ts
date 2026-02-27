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
    dimension: "query" | "page" | "country" | "device";
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
