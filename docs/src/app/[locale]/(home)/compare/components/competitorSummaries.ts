import { comparedCompetitors, type CompetitorSlug } from "../data/competitors";
import type { OtherAlternative } from "./ComparisonPage";

export type { CompetitorSlug };

// One-line summaries for the "Other X alternatives" sections. The text lives in the competitor
// registry (../data/competitors.ts); keep each claim in line with that competitor's
// comparison-data.tsx (vendor-verified), and update both together.
export const competitorSummaries = Object.fromEntries(
  comparedCompetitors.map(entry => [
    entry.slug,
    { name: entry.fullName ?? entry.name, href: entry.comparePath, summary: entry.summary },
  ])
) as Record<CompetitorSlug, OtherAlternative>;

export function pickAlternatives(slugs: CompetitorSlug[]): OtherAlternative[] {
  return slugs.map(slug => {
    const alternative = competitorSummaries[slug];
    if (!alternative) {
      throw new Error(`Competitor "${slug}" has no compare page, so it can't be listed as an alternative.`);
    }
    return alternative;
  });
}
