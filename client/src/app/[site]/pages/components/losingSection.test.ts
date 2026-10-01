import { describe, expect, it } from "vitest";

import type { PagesSummary, SectionViews } from "@/api/analytics/hooks/useGetPages";
import { findOnlyLosingSection } from "./losingSection";

const summary = (sections: [string, number, number][], sectionCount = sections.length): PagesSummary => ({
  pageviews: 0,
  sessions: 0,
  pages: 0,
  bounced_sessions: 0,
  bounce_rate: null,
  time_on_page_seconds: null,
  views_per_session: null,
  sections: sections.map(([section, pageviews, pages]): SectionViews => ({ section, pageviews, pages })),
  sectionCount,
});

describe("findOnlyLosingSection", () => {
  it("names the section when it alone lost views", () => {
    const current = summary([
      ["/docs", 500, 12],
      ["/", 300, 1],
      ["/blog", 180, 8],
    ]);
    const previous = summary([
      ["/docs", 450, 11],
      ["/", 400, 1],
      ["/blog", 200, 8],
    ]);

    // "/" lost views too, but a single page is not a section.
    expect(findOnlyLosingSection(current, previous)).toEqual({
      section: "/blog",
      pageviews: 180,
      previousPageviews: 200,
      rank: 2,
    });
  });

  it("says nothing when no section or several sections lost views", () => {
    const previous = summary([
      ["/docs", 450, 11],
      ["/blog", 200, 8],
    ]);

    expect(
      findOnlyLosingSection(
        summary([
          ["/docs", 500, 12],
          ["/blog", 200, 8],
        ]),
        previous
      )
    ).toBeNull();
    expect(
      findOnlyLosingSection(
        summary([
          ["/docs", 400, 12],
          ["/blog", 180, 8],
        ]),
        previous
      )
    ).toBeNull();
  });

  it("needs another section to compare with", () => {
    expect(findOnlyLosingSection(summary([["/docs", 400, 12]]), summary([["/docs", 450, 11]]))).toBeNull();
  });

  it("counts a section that lost all its traffic", () => {
    const current = summary([["/docs", 500, 12]]);
    const previous = summary([
      ["/docs", 450, 11],
      ["/blog", 200, 8],
    ]);

    expect(findOnlyLosingSection(current, previous)).toEqual({
      section: "/blog",
      pageviews: 0,
      previousPageviews: 200,
      rank: null,
    });
  });

  it("does not point at a section that is down to one page", () => {
    const current = summary([
      ["/docs", 500, 12],
      ["/blog", 50, 1],
    ]);
    const previous = summary([
      ["/docs", 450, 11],
      ["/blog", 200, 8],
    ]);

    expect(findOnlyLosingSection(current, previous)?.rank).toBeNull();
  });

  it("says nothing without a comparison or when either section list was capped", () => {
    const current = summary([
      ["/docs", 500, 12],
      ["/blog", 180, 8],
    ]);
    const previous = summary([
      ["/docs", 450, 11],
      ["/blog", 200, 8],
    ]);

    expect(findOnlyLosingSection(current, undefined)).toBeNull();
    expect(findOnlyLosingSection(undefined, previous)).toBeNull();
    expect(findOnlyLosingSection({ ...current, sectionCount: 900 }, previous)).toBeNull();
    expect(findOnlyLosingSection(current, { ...previous, sectionCount: 900 })).toBeNull();
  });
});
