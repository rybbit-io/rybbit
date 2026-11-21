import type { Segment } from "@rybbit/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSegment, deleteSegment, fetchSegments, SegmentWriteBody, updateSegment } from "../endpoints/segments";

export const SEGMENTS_QUERY_KEY = "get-segments";

export function useGetSegments(siteId?: string | number, options?: { enabled?: boolean }) {
  return useQuery<Segment[]>({
    queryKey: [SEGMENTS_QUERY_KEY, siteId],
    queryFn: () => fetchSegments(siteId!),
    enabled: !!siteId && options?.enabled !== false,
    staleTime: 60_000,
  });
}

export function useCreateSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, body }: { siteId: string | number; body: SegmentWriteBody }) => createSegment(siteId, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SEGMENTS_QUERY_KEY, variables.siteId] });
    },
  });
}

export function useUpdateSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      siteId,
      segmentId,
      body,
    }: {
      siteId: string | number;
      segmentId: number;
      body: Partial<SegmentWriteBody>;
    }) => updateSegment(siteId, segmentId, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SEGMENTS_QUERY_KEY, variables.siteId] });
    },
  });
}

export function useDeleteSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, segmentId }: { siteId: string | number; segmentId: number }) =>
      deleteSegment(siteId, segmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SEGMENTS_QUERY_KEY, variables.siteId] });
    },
  });
}
