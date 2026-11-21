import type { Filter } from "./filters";

/**
 * A saved, named set of filters. `type` is reserved so cohorts (groups fixed
 * by a date or event) can share the table later without a migration.
 */
export type SegmentType = "segment";

export interface Segment {
  segmentId: number;
  /** Null for organization-wide segments, which apply to every site in the org. */
  siteId: number | null;
  organizationId: string;
  /** Creator; null once that account is deleted. */
  userId: string | null;
  name: string;
  description: string | null;
  filters: Filter[];
  /** Visible to public-dashboard and private-link viewers. */
  isPublic: boolean;
  type: SegmentType;
  createdAt: string;
  updatedAt: string;
  /** Whether the caller may edit or delete this segment; computed per request. */
  canEdit: boolean;
}

export type SegmentScope = "site" | "organization";

export const SEGMENT_NAME_MAX_LENGTH = 80;
export const SEGMENT_DESCRIPTION_MAX_LENGTH = 500;
export const SEGMENT_MAX_FILTERS = 20;
