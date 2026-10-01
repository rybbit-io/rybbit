import type { PagesSummary } from "@/api/analytics/hooks/useGetPages";

export interface LosingSection {
  section: string;
  pageviews: number;
  previousPageviews: number;
  /**
   * Where the section sits among the top-level rows sorted by views, or null
   * when it is not a row of its own in this period (fewer than two pages left).
   */
  rank: number | null;
}

// A list the server capped cannot prove that no other section lost traffic.
const isComplete = (summary: PagesSummary) => summary.sections.length >= summary.sectionCount;

/**
 * The one section with fewer views than in the comparison period, when every
 * other section held or grew. Null in every other case: no comparison, a
 * capped section list, fewer than two sections, or none or several losing.
 *
 * A section is a first path segment with two or more pages in either period,
 * so one that lost all its traffic still counts as losing.
 */
export function findOnlyLosingSection(
  current: PagesSummary | undefined,
  previous: PagesSummary | undefined
): LosingSection | null {
  if (!current || !previous || !isComplete(current) || !isComplete(previous)) return null;

  const now = new Map(current.sections.map(section => [section.section, section]));
  const before = new Map(previous.sections.map(section => [section.section, section]));

  const sections = [...new Set([...now.keys(), ...before.keys()])].filter(
    key => (now.get(key)?.pages ?? 0) >= 2 || (before.get(key)?.pages ?? 0) >= 2
  );
  if (sections.length < 2) return null;

  const losing = sections.filter(key => (now.get(key)?.pageviews ?? 0) < (before.get(key)?.pageviews ?? 0));
  if (losing.length !== 1) return null;

  const [section] = losing;
  const rank = current.sections.findIndex(candidate => candidate.section === section);

  return {
    section,
    pageviews: now.get(section)?.pageviews ?? 0,
    previousPageviews: before.get(section)?.pageviews ?? 0,
    rank: rank !== -1 && (now.get(section)?.pages ?? 0) >= 2 ? rank : null,
  };
}
