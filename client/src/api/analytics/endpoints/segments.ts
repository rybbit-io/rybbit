import type { Filter, Segment, SegmentScope } from "@rybbit/shared";
import { authedFetch } from "../../utils";

export interface SegmentWriteBody {
  name: string;
  description?: string | null;
  filters: Filter[];
  isPublic?: boolean;
  scope?: SegmentScope;
}

export function fetchSegments(site: string | number) {
  return authedFetch<Segment[]>(`/sites/${site}/segments`);
}

export function fetchSegment(site: string | number, segmentId: number) {
  return authedFetch<Segment>(`/sites/${site}/segments/${segmentId}`);
}

export function createSegment(site: string | number, body: SegmentWriteBody) {
  return authedFetch<Segment>(`/sites/${site}/segments`, undefined, { method: "POST", data: body });
}

export function updateSegment(site: string | number, segmentId: number, body: Partial<SegmentWriteBody>) {
  return authedFetch<Segment>(`/sites/${site}/segments/${segmentId}`, undefined, { method: "PUT", data: body });
}

export function deleteSegment(site: string | number, segmentId: number) {
  return authedFetch<{ success: true }>(`/sites/${site}/segments/${segmentId}`, undefined, { method: "DELETE" });
}
