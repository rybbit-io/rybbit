import { authedFetch } from "../../utils";

export type CustomQueryRow = Record<string, unknown>;

export type RunCustomQueryResponse = {
  data: CustomQueryRow[];
  meta: {
    queryId: string;
    rowCount: number;
    maxExecutionTimeSeconds: number;
    maxRows: number;
  };
};

export type GenerateCustomQueryResponse = {
  query: string;
};

export type CustomQueryGenerationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type GenerateCustomQueryRequest = {
  prompt: string;
  currentSiteId?: number;
  currentQuery?: string;
  history?: CustomQueryGenerationMessage[];
};

export function runCustomQuery(organizationId: string, query: string) {
  return authedFetch<RunCustomQueryResponse>(`/organizations/${organizationId}/analytics/query`, undefined, {
    method: "POST",
    data: { query },
  });
}

export function generateCustomQuery(organizationId: string, data: GenerateCustomQueryRequest, signal?: AbortSignal) {
  return authedFetch<GenerateCustomQueryResponse>(
    `/organizations/${organizationId}/analytics/query/generate`,
    undefined,
    {
      method: "POST",
      data,
      signal,
    }
  );
}
