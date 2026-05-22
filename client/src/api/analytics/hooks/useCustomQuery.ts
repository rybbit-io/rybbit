import { useMutation } from "@tanstack/react-query";
import { CustomQueryGenerationMessage, generateCustomQuery, runCustomQuery } from "../endpoints/customQuery";

export function useRunCustomQuery() {
  return useMutation({
    mutationFn: ({ organizationId, query }: { organizationId: string; query: string }) =>
      runCustomQuery(organizationId, query),
  });
}

export function useGenerateCustomQuery() {
  return useMutation({
    mutationFn: ({
      organizationId,
      prompt,
      currentSiteId,
      currentQuery,
      history,
      signal,
    }: {
      organizationId: string;
      prompt: string;
      currentSiteId?: number;
      currentQuery?: string;
      history?: CustomQueryGenerationMessage[];
      signal?: AbortSignal;
    }) => generateCustomQuery(organizationId, { prompt, currentSiteId, currentQuery, history }, signal),
  });
}
