import type { Annotation, AnnotationColor, AnnotationScope } from "@rybbit/shared";
import { authedFetch } from "../../utils";

export type AnnotationWriteBody = {
  title: string;
  description?: string | null;
  /** ISO 8601 timestamp. */
  date: string;
  /** ISO 8601 timestamp, or null to clear a range. */
  endDate?: string | null;
  color?: AnnotationColor | null;
  icon?: string | null;
  isPublic?: boolean;
  scope?: AnnotationScope;
};

export function fetchAnnotations(site: string | number) {
  return authedFetch<Annotation[]>(`/sites/${site}/annotations`);
}

export function createAnnotation(site: string | number, body: AnnotationWriteBody) {
  return authedFetch<{ success: true; annotationId: number }>(`/sites/${site}/annotations`, undefined, {
    method: "POST",
    data: body,
  });
}

export function updateAnnotation(site: string | number, annotationId: number, body: Partial<AnnotationWriteBody>) {
  return authedFetch<{ success: true }>(`/sites/${site}/annotations/${annotationId}`, undefined, {
    method: "PUT",
    data: body,
  });
}

export function deleteAnnotation(site: string | number, annotationId: number) {
  return authedFetch<{ success: true }>(`/sites/${site}/annotations/${annotationId}`, undefined, {
    method: "DELETE",
  });
}
