import { authedFetch } from "../../utils";
import { updateSiteConfig } from "./sites";

export interface ExcludedPathsResponse {
  success: boolean;
  excludedPaths: string[];
  error?: string;
}

export interface ExcludedHostnamesResponse {
  success: boolean;
  excludedHostnames: string[];
  error?: string;
}

export interface ExcludedUserAgentsResponse {
  success: boolean;
  excludedUserAgents: string[];
  error?: string;
}

export interface UpdateExcludedPathsRequest {
  siteId: number;
  excludedPaths: string[];
}

export interface UpdateExcludedHostnamesRequest {
  siteId: number;
  excludedHostnames: string[];
}

export interface UpdateExcludedUserAgentsRequest {
  siteId: number;
  excludedUserAgents: string[];
}

export interface ExcludedASNsResponse {
  success: boolean;
  excludedASNs: string[];
  error?: string;
}

export interface ExcludedQueryParamsResponse {
  success: boolean;
  excludedQueryParams: string[];
  error?: string;
}

export interface UpdateExcludedASNsRequest {
  siteId: number;
  excludedASNs: string[];
}

export interface UpdateExcludedQueryParamsRequest {
  siteId: number;
  excludedQueryParams: string[];
}

// Excluded paths
export const fetchExcludedPaths = async (siteId: string): Promise<ExcludedPathsResponse> => {
  return await authedFetch<ExcludedPathsResponse>(`/sites/${siteId}/excluded-paths`);
};

export const updateExcludedPaths = async (siteId: number, excludedPaths: string[]): Promise<void> => {
  await updateSiteConfig(siteId, { excludedPaths });
};

// Excluded hostnames
export const fetchExcludedHostnames = async (siteId: string): Promise<ExcludedHostnamesResponse> => {
  return await authedFetch<ExcludedHostnamesResponse>(`/sites/${siteId}/excluded-hostnames`);
};

export const updateExcludedHostnames = async (siteId: number, excludedHostnames: string[]): Promise<void> => {
  await updateSiteConfig(siteId, { excludedHostnames });
};

// Excluded user agents
export const fetchExcludedUserAgents = async (siteId: string): Promise<ExcludedUserAgentsResponse> => {
  return await authedFetch<ExcludedUserAgentsResponse>(`/sites/${siteId}/excluded-user-agents`);
};

export const updateExcludedUserAgents = async (siteId: number, excludedUserAgents: string[]): Promise<void> => {
  await updateSiteConfig(siteId, { excludedUserAgents });
};

// Excluded ASNs
export const fetchExcludedASNs = async (siteId: string): Promise<ExcludedASNsResponse> => {
  return await authedFetch<ExcludedASNsResponse>(`/sites/${siteId}/excluded-asns`);
};

export const updateExcludedASNs = async (siteId: number, excludedASNs: string[]): Promise<void> => {
  await updateSiteConfig(siteId, { excludedASNs });
};

// Excluded query params
export const fetchExcludedQueryParams = async (siteId: string): Promise<ExcludedQueryParamsResponse> => {
  return await authedFetch<ExcludedQueryParamsResponse>(`/sites/${siteId}/excluded-query-params`);
};

export const updateExcludedQueryParams = async (siteId: number, excludedQueryParams: string[]): Promise<void> => {
  await updateSiteConfig(siteId, { excludedQueryParams });
};
