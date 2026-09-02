import type { Filter, Segment } from "@rybbit/shared";

// @rybbit/shared is a types-only dependency of the client (its imports are
// erased at compile time), so these mirror shared/src/segments.ts. The server
// enforces the same limits; keep the two in sync.
export const SEGMENT_NAME_MAX_LENGTH = 80;
export const SEGMENT_DESCRIPTION_MAX_LENGTH = 500;
export const SEGMENT_MAX_FILTERS = 20;

export const filterKey = (filter: Filter) => JSON.stringify([filter.parameter, filter.type, filter.value]);

/**
 * Splits the dashboard's filters into the ones an applied segment contributed
 * and the ad-hoc rest. A segment filter that is no longer present means the
 * user edited the segment's part of the row (or followed an edited link), so
 * the chip can say so instead of pretending the segment still applies intact.
 */
export function partitionFilters(filters: Filter[], segment: Segment | undefined) {
  if (!segment) {
    return { adHoc: filters, intact: true };
  }
  const segmentKeys = new Set(segment.filters.map(filterKey));
  const present = new Set<string>();
  const adHoc = filters.filter(filter => {
    const key = filterKey(filter);
    if (segmentKeys.has(key)) {
      present.add(key);
      return false;
    }
    return true;
  });
  return { adHoc, intact: present.size === segmentKeys.size };
}
