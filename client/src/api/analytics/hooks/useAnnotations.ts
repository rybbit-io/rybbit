import type { Annotation } from "@rybbit/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AnnotationWriteBody,
  createAnnotation,
  deleteAnnotation,
  fetchAnnotations,
  updateAnnotation,
} from "../endpoints/annotations";

export const ANNOTATIONS_QUERY_KEY = "get-annotations";

export function useGetAnnotations(siteId?: string | number) {
  return useQuery<Annotation[]>({
    queryKey: [ANNOTATIONS_QUERY_KEY, siteId],
    queryFn: () => fetchAnnotations(siteId!),
    enabled: !!siteId,
    staleTime: 60_000,
  });
}

export function useCreateAnnotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, body }: { siteId: string | number; body: AnnotationWriteBody }) =>
      createAnnotation(siteId, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ANNOTATIONS_QUERY_KEY, variables.siteId] });
    },
  });
}

export function useUpdateAnnotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      siteId,
      annotationId,
      body,
    }: {
      siteId: string | number;
      annotationId: number;
      body: Partial<AnnotationWriteBody>;
    }) => updateAnnotation(siteId, annotationId, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ANNOTATIONS_QUERY_KEY, variables.siteId] });
    },
  });
}

export function useDeleteAnnotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, annotationId }: { siteId: string | number; annotationId: number }) =>
      deleteAnnotation(siteId, annotationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ANNOTATIONS_QUERY_KEY, variables.siteId] });
    },
  });
}
