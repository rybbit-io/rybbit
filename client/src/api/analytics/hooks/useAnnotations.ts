import type { Annotation } from "@rybbit/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "../../../lib/auth";
import { useStore } from "../../../lib/store";
import {
  AnnotationWriteBody,
  createAnnotation,
  deleteAnnotation,
  fetchAnnotations,
  updateAnnotation,
} from "../endpoints/annotations";

export const ANNOTATIONS_QUERY_KEY = "get-annotations";

/**
 * The endpoint returns different rows per viewer (members see everything,
 * public and private-link viewers only public rows), so the cache is keyed by
 * who is asking and waits for the session to resolve before fetching.
 */
export function useGetAnnotations(siteId?: string | number) {
  const { privateKey } = useStore();
  const session = authClient.useSession();
  const viewer = privateKey ? `link:${privateKey}` : session.data?.user.id ? `user:${session.data.user.id}` : "anon";
  return useQuery<Annotation[]>({
    queryKey: [ANNOTATIONS_QUERY_KEY, siteId, viewer],
    queryFn: () => fetchAnnotations(siteId!),
    enabled: !!siteId && !session.isPending,
    staleTime: 60_000,
  });
}

export function useCreateAnnotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, body }: { siteId: string | number; body: AnnotationWriteBody }) =>
      createAnnotation(siteId, body),
    // Organization-wide annotations show on every site, so drop every cached list.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ANNOTATIONS_QUERY_KEY] });
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
    // Organization-wide annotations show on every site, so drop every cached list.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ANNOTATIONS_QUERY_KEY] });
    },
  });
}

export function useDeleteAnnotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ siteId, annotationId }: { siteId: string | number; annotationId: number }) =>
      deleteAnnotation(siteId, annotationId),
    // Organization-wide annotations show on every site, so drop every cached list.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ANNOTATIONS_QUERY_KEY] });
    },
  });
}
