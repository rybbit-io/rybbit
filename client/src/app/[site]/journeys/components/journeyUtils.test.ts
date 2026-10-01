import { describe, expect, it } from "vitest";
import {
  buildSankeyGraph,
  connectedLinkIds,
  JourneyRow,
  largestExit,
  layoutSankey,
  linkId,
  nodeId,
  NODE_WIDTH,
  pagePatternToRegExp,
  pathContainsPage,
  pathContinuation,
  pathKey,
  sectionOfPage,
  startsWithPath,
  truncateMiddle,
} from "./journeyUtils";

// 1,000 multi-page sessions in total; these four paths cover 600 of them.
const journey = (path: string[], count: number): JourneyRow => ({ path, count, percentage: count / 10 });
const JOURNEYS = [
  journey(["/", "/pricing"], 300),
  journey(["/", "/pricing", "/signup"], 150),
  journey(["/", "/demo", "/pricing", "/signup"], 100),
  journey(["/docs", "/pricing"], 50),
];

const node = (graph: ReturnType<typeof buildSankeyGraph>, step: number, name: string) => {
  const found = graph.nodes.find(candidate => candidate.id === nodeId(step, name));
  if (!found) throw new Error(`no node ${step} ${name}`);
  return found;
};

describe("pathKey and startsWithPath", () => {
  it("tells apart paths a separator would merge", () => {
    expect(pathKey(["/a > /b"])).not.toBe(pathKey(["/a", "/b"]));
    expect(pathKey(["/a", "/b"])).toBe(pathKey(["/a", "/b"]));
  });

  it("matches a path against a prefix", () => {
    expect(startsWithPath(["/", "/pricing", "/signup"], ["/", "/pricing"])).toBe(true);
    expect(startsWithPath(["/", "/pricing"], ["/", "/pricing"])).toBe(true);
    expect(startsWithPath(["/", "/pricing"], ["/", "/pricing", "/signup"])).toBe(false);
    expect(startsWithPath(["/", "/pricing"], ["/pricing"])).toBe(false);
  });
});

describe("page patterns", () => {
  it("matches one segment with * and any number with **", () => {
    expect(pagePatternToRegExp("/blog/*").test("/blog/post")).toBe(true);
    expect(pagePatternToRegExp("/blog/*").test("/blog/2026/post")).toBe(false);
    expect(pagePatternToRegExp("/docs/**").test("/docs/api/events")).toBe(true);
    expect(pagePatternToRegExp("/docs/**").test("/docs")).toBe(false);
  });

  it("treats every other character literally", () => {
    expect(pagePatternToRegExp("/v1.2/*").test("/v1x2/a")).toBe(false);
    expect(pagePatternToRegExp("/v1.2/*").test("/v1.2/a")).toBe(true);
    expect(pagePatternToRegExp("/a(b)+/**").test("/a(b)+/c")).toBe(true);
  });

  it("finds a page by any part of its name, or by a whole-page pattern", () => {
    const path = ["/", "/docs/script", "/Pricing"];
    expect(pathContainsPage(path, "")).toBe(true);
    expect(pathContainsPage(path, "  ")).toBe(true);
    expect(pathContainsPage(path, "pricing")).toBe(true);
    expect(pathContainsPage(path, "script")).toBe(true);
    expect(pathContainsPage(path, "/docs/**")).toBe(true);
    expect(pathContainsPage(path, "/docs/*/more")).toBe(false);
    expect(pathContainsPage(path, "signup")).toBe(false);
  });

  it("names the section of a page the way the server groups it", () => {
    expect(sectionOfPage("/docs/script")).toBe("/docs/**");
    expect(sectionOfPage("/docs/api/events")).toBe("/docs/**");
    expect(sectionOfPage("/docs")).toBe("/docs");
    expect(sectionOfPage("/docs/")).toBe("/docs/");
    expect(sectionOfPage("/")).toBe("/");
  });
});

describe("buildSankeyGraph", () => {
  const graph = buildSankeyGraph(JOURNEYS, 4);

  it("counts a page once per step, from every path through it", () => {
    expect(node(graph, 0, "/").count).toBe(550);
    expect(node(graph, 1, "/pricing").count).toBe(500);
    expect(node(graph, 2, "/pricing").count).toBe(100);
    expect(graph.stepTotals).toEqual([600, 600, 250, 100]);
  });

  it("gives a page its own share, not the share of the first path through it", () => {
    // The old tooltip showed 30% here: the share of "/ > /pricing" alone.
    expect(node(graph, 0, "/").percentage).toBeCloseTo(55);
    expect(node(graph, 1, "/pricing").percentage).toBeCloseTo(50);
  });

  it("counts the sessions that ended on a page: those whose path stops there", () => {
    const pricing = node(graph, 1, "/pricing");
    expect(pricing.continued).toBe(150);
    expect(pricing.exits).toBe(350);
    expect(node(graph, 0, "/").exits).toBe(0);
    expect(node(graph, 2, "/signup").exits).toBe(150);
  });

  it("reports no exits on the last step, where a path may have been cut short", () => {
    expect(node(graph, 3, "/signup").exits).toBeNull();
  });

  it("reports no exits at all when paths are cut at an end page", () => {
    const cut = buildSankeyGraph(JOURNEYS, 4, false);
    expect(cut.nodes.every(candidate => candidate.exits === null)).toBe(true);
  });

  it("merges the sessions of every path that shares a link", () => {
    const home = nodeId(0, "/");
    const pricing = nodeId(1, "/pricing");
    const link = graph.links.find(candidate => candidate.id === linkId(home, pricing));
    expect(link?.value).toBe(450);
    expect(
      node(graph, 0, "/")
        .outgoing.map(candidate => candidate.value)
        .sort()
    ).toEqual([100, 450]);
    expect(
      node(graph, 1, "/pricing")
        .incoming.map(candidate => candidate.value)
        .sort()
    ).toEqual([450, 50]);
  });

  it("ignores pages beyond the requested steps", () => {
    const short = buildSankeyGraph(JOURNEYS, 2);
    expect(short.stepTotals).toEqual([600, 600]);
    expect(short.nodes.every(candidate => candidate.step < 2)).toBe(true);
  });

  it("is empty for no journeys", () => {
    expect(buildSankeyGraph([], 4)).toEqual({ nodes: [], links: [], stepTotals: [] });
  });
});

describe("connectedLinkIds", () => {
  const graph = buildSankeyGraph(JOURNEYS, 4);
  const link = (source: string, target: string) => {
    const found = graph.links.find(candidate => candidate.id === linkId(source, target));
    if (!found) throw new Error("no link");
    return found;
  };

  it("follows a link forwards and backwards, and nothing beside it", () => {
    const connected = connectedLinkIds(graph, [link(nodeId(1, "/demo"), nodeId(2, "/pricing"))]);
    expect([...connected].sort()).toEqual(
      [
        linkId(nodeId(0, "/"), nodeId(1, "/demo")),
        linkId(nodeId(1, "/demo"), nodeId(2, "/pricing")),
        linkId(nodeId(2, "/pricing"), nodeId(3, "/signup")),
      ].sort()
    );
  });
});

describe("pathContinuation", () => {
  it("counts the sessions that got as far as each page of the path", () => {
    expect(pathContinuation(JOURNEYS, ["/", "/pricing", "/signup"])).toEqual([
      { page: "/", sessions: 550, continued: null },
      { page: "/pricing", sessions: 450, continued: 450 / 550 },
      { page: "/signup", sessions: 150, continued: 150 / 450 },
    ]);
  });

  it("is zero, without dividing by it, for a path none of the journeys take", () => {
    expect(pathContinuation(JOURNEYS, ["/nowhere", "/else"])).toEqual([
      { page: "/nowhere", sessions: 0, continued: null },
      { page: "/else", sessions: 0, continued: null },
    ]);
  });
});

describe("largestExit", () => {
  it("picks the path where the most sessions ended while others carried on", () => {
    expect(largestExit(JOURNEYS, 4)).toEqual({ path: ["/", "/pricing"], exits: 300, sessions: 450 });
  });

  it("skips a path nobody on the shown paths continues: nothing to compare the exits with", () => {
    expect(largestExit([journey(["/blog", "/pricing"], 900), ...JOURNEYS], 4)).toEqual({
      path: ["/", "/pricing"],
      exits: 300,
      sessions: 450,
    });
  });

  it("skips paths that fill every step, which may not have ended", () => {
    expect(largestExit([journey(["/", "/a"], 10), journey(["/", "/b"], 5)], 2)).toBeNull();
  });

  it("is null without journeys", () => {
    expect(largestExit([], 4)).toBeNull();
  });
});

describe("layoutSankey", () => {
  const graph = buildSankeyGraph(JOURNEYS, 4);
  const layout = layoutSankey(graph, 4, 1104);
  const placed = (step: number, name: string) => {
    const found = layout.nodes.find(candidate => candidate.id === nodeId(step, name));
    if (!found) throw new Error("no node");
    return found;
  };

  it("spreads the columns across the width, leaving the last one room for labels", () => {
    expect(layout.columns).toEqual([0, 296, 592, 888]);
    expect(layout.width).toBe(1104);
    expect(layout.labelWidths).toEqual([268, 268, 268, 188]);
  });

  it("uses one scale for bars and bands, set by the busiest step", () => {
    expect(layout.scale).toBeCloseTo(320 / 600);
    expect(placed(0, "/").height).toBeCloseTo(550 * layout.scale);
    const band = layout.links.find(link => link.id === linkId(nodeId(0, "/"), nodeId(1, "/pricing")));
    expect(band?.thickness).toBeCloseTo(450 * layout.scale);
  });

  it("stacks rows without overlap and keeps a label's height for thin bars", () => {
    for (let step = 0; step < 4; step++) {
      const column = layout.nodes.filter(candidate => candidate.step === step).sort((a, b) => a.y - b.y);
      for (let i = 1; i < column.length; i++) {
        const above = column[i - 1];
        expect(column[i].y).toBeGreaterThanOrEqual(above.y + Math.max(above.height, 34));
      }
    }
    expect(layout.height).toBe(Math.max(...layout.columnBottoms));
  });

  it("orders the first column by size and later ones by where their sessions come from", () => {
    expect(placed(0, "/").y).toBeLessThan(placed(0, "/docs").y);
    // Both come from "/": the larger goes first.
    expect(placed(1, "/pricing").y).toBeLessThan(placed(1, "/demo").y);
    // /signup at step 3 is fed from /pricing (top of step 2); /pricing at step 3 from /demo below it.
    expect(placed(2, "/signup").y).toBeLessThan(placed(2, "/pricing").y);
  });

  it("stacks a bar's bands from its top, in the order of the rows they lead to", () => {
    const home = placed(0, "/");
    const toPricing = layout.links.find(link => link.id === linkId(home.id, nodeId(1, "/pricing")));
    const toDemo = layout.links.find(link => link.id === linkId(home.id, nodeId(1, "/demo")));
    expect(toPricing?.sourceY).toBe(home.y);
    expect(toDemo?.sourceY).toBeCloseTo(home.y + 450 * layout.scale);
  });

  it("keeps a minimum column pitch, growing wider than a narrow box", () => {
    const narrow = layoutSankey(graph, 4, 340);
    expect(narrow.columns).toEqual([0, 176, 352, 528]);
    expect(narrow.width).toBe(528 + 140);
    expect(narrow.labelWidths.every(width => width >= 140 - NODE_WIDTH - 20)).toBe(true);
  });

  it("switches to single-line rows when a column has many pages", () => {
    const many = Array.from({ length: 30 }, (_, index) => journey(["/", `/page-${index}`], 30 - index));
    expect(layoutSankey(buildSankeyGraph(many, 2), 2, 1000).compact).toBe(true);
    expect(layout.compact).toBe(false);
  });

  it("lays out nothing for no journeys", () => {
    const empty = layoutSankey(buildSankeyGraph([], 4), 4, 1000);
    expect(empty.nodes).toEqual([]);
    expect(empty.height).toBe(0);
  });
});

describe("truncateMiddle", () => {
  it("keeps short text and both ends of long text", () => {
    expect(truncateMiddle("/pricing", 20)).toBe("/pricing");
    expect(truncateMiddle("/blog/google-analytics-alternatives", 16)).toBe("/blog/go…natives");
    expect(truncateMiddle("/blog/google-analytics-alternatives", 16)).toHaveLength(16);
    expect(truncateMiddle("/abc", 1)).toBe("…");
  });
});
