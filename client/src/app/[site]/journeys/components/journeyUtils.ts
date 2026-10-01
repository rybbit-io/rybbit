/** A journeys row: one exact page sequence from session start and the sessions that took it. */
export interface JourneyRow {
  path: string[];
  count: number;
  /** Share of the sessions with two or more pages, 0–100. */
  percentage: number;
  conversions?: number;
}

/** Identifies a path. Pages can contain any character, so they are not joined with a separator. */
export const pathKey = (path: string[]) => JSON.stringify(path);

export const startsWithPath = (path: string[], prefix: string[]) =>
  prefix.length <= path.length && prefix.every((page, index) => path[index] === page);

/** A fraction as a percentage with up to `digits` decimals and no trailing zeros: 27.4%, 100%, 0%. */
export const formatShare = (fraction: number, digits = 1) => `${Number((fraction * 100).toFixed(digits))}%`;

// ───────── page patterns ─────────

/**
 * The same wildcard grammar the server applies to step filters, goals and
 * funnel steps: * is one path segment, ** is any number of them.
 */
export function pagePatternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const source = escaped
    .split("**")
    .map(part => part.replace(/\*/g, "[^/]+"))
    .join(".*");
  return new RegExp(`^${source}$`);
}

/**
 * Whether a path visits a page matching `query`. With a wildcard the query is
 * a pattern for a whole page; without one it matches any part of a page, so
 * typing "pricing" finds /pricing.
 */
export function pathContainsPage(path: string[], query: string): boolean {
  const needle = query.trim();
  if (!needle) return true;
  if (needle.includes("*")) {
    const pattern = pagePatternToRegExp(needle);
    return path.some(page => pattern.test(page));
  }
  const lower = needle.toLowerCase();
  return path.some(page => page.toLowerCase().includes(lower));
}

/**
 * The section a page belongs to when pages are grouped: anything below a
 * first-level folder becomes that folder's pattern (/docs/script → /docs/**),
 * and top-level pages keep their own name. Mirrors the server's grouping.
 */
export function sectionOfPage(page: string): string {
  const match = /^(\/[^/]+)\/.+/.exec(page);
  return match ? `${match[1]}/**` : page;
}

// ───────── the graph ─────────

export interface SankeyLink {
  id: string;
  source: string;
  target: string;
  /** Sessions that went from the source page to the target page at this step. */
  value: number;
}

export interface SankeyNode {
  id: string;
  name: string;
  /** Zero-based step. */
  step: number;
  /** Sessions on the shown paths that were on this page at this step. */
  count: number;
  /** How many of them went on to another shown step. */
  continued: number;
  /**
   * How many ended the session here. Null on the last step, where a path may
   * have been cut short, and when paths are cut at an end page.
   */
  exits: number | null;
  /** Share of the sessions with two or more pages, 0–100. */
  percentage: number;
  incoming: SankeyLink[];
  outgoing: SankeyLink[];
}

export interface SankeyGraph {
  nodes: SankeyNode[];
  links: SankeyLink[];
  /** Sessions on the shown paths at each step. */
  stepTotals: number[];
}

export const nodeId = (step: number, name: string) => `${step}_${name}`;
export const linkId = (source: string, target: string) => `${source}|||${target}`;

/**
 * Folds the journeys into the nodes and links of the diagram. Every figure is
 * a sum over the journeys given, so it describes the shown paths, not the
 * whole site.
 *
 * A journey shorter than `steps` is a session that ended on its last page; one
 * that fills every step may have gone on, so the last step reports no exits.
 * `exitsKnown` is false when the journeys were cut at an end page instead of
 * where the session ended.
 */
export function buildSankeyGraph(journeys: JourneyRow[], steps: number, exitsKnown = true): SankeyGraph {
  const nodes = new Map<string, SankeyNode>();
  const links = new Map<string, SankeyLink>();
  const stepTotals: number[] = [];

  for (const journey of journeys) {
    const path = journey.path.slice(0, steps);
    path.forEach((name, step) => {
      const id = nodeId(step, name);
      let node = nodes.get(id);
      if (!node) {
        node = { id, name, step, count: 0, continued: 0, exits: null, percentage: 0, incoming: [], outgoing: [] };
        nodes.set(id, node);
      }
      node.count += journey.count;
      node.percentage += journey.percentage;
      stepTotals[step] = (stepTotals[step] ?? 0) + journey.count;

      if (step < path.length - 1) {
        node.continued += journey.count;
        const target = nodeId(step + 1, path[step + 1]);
        const id = linkId(node.id, target);
        const link = links.get(id);
        if (link) link.value += journey.count;
        else links.set(id, { id, source: node.id, target, value: journey.count });
      }
    });
  }

  for (const link of links.values()) {
    nodes.get(link.source)?.outgoing.push(link);
    nodes.get(link.target)?.incoming.push(link);
  }
  for (const node of nodes.values()) {
    node.exits = exitsKnown && node.step < steps - 1 ? node.count - node.continued : null;
  }

  return { nodes: [...nodes.values()], links: [...links.values()], stepTotals };
}

/** Every link reachable from `start` going forwards and every link leading to it. */
export function connectedLinkIds(graph: SankeyGraph, start: SankeyLink[]): Set<string> {
  const nodesById = new Map(graph.nodes.map(node => [node.id, node]));
  const connected = new Set<string>();

  const walk = (direction: "forward" | "backward") => {
    const queue = [...start];
    const seen = new Set<string>();
    for (let link = queue.shift(); link; link = queue.shift()) {
      if (seen.has(link.id)) continue;
      seen.add(link.id);
      connected.add(link.id);
      const next =
        direction === "forward" ? nodesById.get(link.target)?.outgoing : nodesById.get(link.source)?.incoming;
      if (next) queue.push(...next);
    }
  };
  walk("forward");
  walk("backward");

  return connected;
}

// ───────── one path ─────────

export interface ContinuationStep {
  page: string;
  /** Sessions on the shown paths that followed the path up to and including this page. */
  sessions: number;
  /** Share of the previous step's sessions that got here; null on the first step. */
  continued: number | null;
}

/** How the sessions on the shown paths thin out along one path, page by page. */
export function pathContinuation(journeys: JourneyRow[], path: string[]): ContinuationStep[] {
  let previous: number | null = null;
  return path.map((page, index) => {
    const prefix = path.slice(0, index + 1);
    const sessions = journeys.reduce(
      (total, journey) => (startsWithPath(journey.path, prefix) ? total + journey.count : total),
      0
    );
    const continued = previous === null || previous === 0 ? null : sessions / previous;
    previous = sessions;
    return { page, sessions, continued };
  });
}

export interface PathExit {
  path: string[];
  /** Sessions that took exactly this path and ended there. */
  exits: number;
  /** Sessions on the shown paths that started with this path. */
  sessions: number;
}

/**
 * The shown path where the most sessions ended while others carried on: a
 * journey shorter than `steps` (so the session ended on its last page) that at
 * least one other shown journey continues.
 */
export function largestExit(journeys: JourneyRow[], steps: number): PathExit | null {
  let best: PathExit | null = null;
  for (const journey of journeys) {
    if (journey.path.length >= steps || journey.path.length < 2) continue;
    if (best && journey.count <= best.exits) continue;
    const sessions = journeys.reduce(
      (total, other) => (startsWithPath(other.path, journey.path) ? total + other.count : total),
      0
    );
    if (sessions > journey.count) best = { path: journey.path, exits: journey.count, sessions };
  }
  return best;
}

// ───────── layout ─────────

export interface LaidOutNode extends SankeyNode {
  x: number;
  /** Top of the bar. */
  y: number;
  height: number;
}

export interface LaidOutLink extends SankeyLink {
  /** Top edge of the band where it leaves the source and where it enters the target. */
  sourceY: number;
  targetY: number;
  thickness: number;
}

export interface SankeyLayout {
  nodes: LaidOutNode[];
  links: LaidOutLink[];
  /** Left edge of each step's column. */
  columns: number[];
  /** Horizontal room for a label next to a bar, per column. */
  labelWidths: number[];
  /** Rows are too many for two-line labels. */
  compact: boolean;
  /** Pixels per session, the same for bars and bands. */
  scale: number;
  width: number;
  height: number;
  /** Bottom of the lowest row in each column. */
  columnBottoms: number[];
}

export const NODE_WIDTH = 8;
const NODE_GAP = 8;
const MIN_NODE_HEIGHT = 2;
// A row is at least as tall as its two-line label (one line when compact).
const ROW_HEIGHT = 34;
const COMPACT_ROW_HEIGHT = 18;
const COMPACT_ABOVE_ROWS = 18;
// The tallest column's bars add up to this many pixels.
const BAR_BUDGET = 320;
const MIN_COLUMN_STEP = 176;
// Space kept clear between a label and the next column's bar.
const LABEL_GUTTER = 20;
const LAST_COLUMN_WIDTH = 216;
const MIN_LAST_COLUMN_WIDTH = 140;

/**
 * Positions the graph in a `width`-wide box. Columns keep a minimum pitch, so
 * the result can be wider than the box (the caller scrolls). Rows are ordered
 * to keep the big bands from crossing: the first column by size, the rest by
 * the page most of their sessions come from.
 */
export function layoutSankey(graph: SankeyGraph, steps: number, width: number): SankeyLayout {
  const columnCount = Math.max(steps, 1);
  const lastColumnWidth = Math.max(MIN_LAST_COLUMN_WIDTH, Math.min(LAST_COLUMN_WIDTH, width / columnCount));
  const columnStep = columnCount > 1 ? Math.max(MIN_COLUMN_STEP, (width - lastColumnWidth) / (columnCount - 1)) : width;
  const columns = Array.from({ length: columnCount }, (_, step) => step * columnStep);
  const laidOutWidth = columnCount > 1 ? columns[columnCount - 1] + lastColumnWidth : width;

  const scale = BAR_BUDGET / Math.max(1, ...graph.stepTotals.filter(Boolean));
  const byStep: SankeyNode[][] = Array.from({ length: columnCount }, () => []);
  for (const node of graph.nodes) byStep[node.step]?.push(node);

  const compact = byStep.some(column => column.length > COMPACT_ABOVE_ROWS);
  const rowHeight = compact ? COMPACT_ROW_HEIGHT : ROW_HEIGHT;

  const placed = new Map<string, LaidOutNode>();
  const columnBottoms: number[] = [];

  byStep.forEach((column, step) => {
    // A row sits by the page most of its sessions came from; rows that share
    // one are ordered by size. Children of the top row come first, so the big
    // bands run level and the small ones do the crossing.
    const origin = (node: SankeyNode) => {
      let main: SankeyLink | undefined;
      for (const link of node.incoming) {
        if (placed.has(link.source) && (!main || link.value > main.value)) main = link;
      }
      return main ? (placed.get(main.source)?.y ?? 0) : Number.POSITIVE_INFINITY;
    };
    const origins = new Map(column.map(node => [node.id, step === 0 ? 0 : origin(node)]));
    const ordered = [...column].sort(
      (a, b) => (origins.get(a.id) ?? 0) - (origins.get(b.id) ?? 0) || b.count - a.count || a.name.localeCompare(b.name)
    );

    let y = 0;
    for (const node of ordered) {
      const height = Math.max(MIN_NODE_HEIGHT, node.count * scale);
      placed.set(node.id, { ...node, x: columns[step], y, height });
      y += Math.max(height, rowHeight) + NODE_GAP;
    }
    columnBottoms.push(Math.max(0, y - NODE_GAP));
  });

  // Bands stack from the top of each bar, in the order of the rows they connect to.
  const positions = new Map<string, { sourceY: number; targetY: number }>();
  const position = (id: string) => {
    let entry = positions.get(id);
    if (!entry) {
      entry = { sourceY: 0, targetY: 0 };
      positions.set(id, entry);
    }
    return entry;
  };
  for (const node of placed.values()) {
    const rowOf = (id: string) => placed.get(id)?.y ?? 0;
    let y = node.y;
    for (const link of [...node.outgoing].sort((a, b) => rowOf(a.target) - rowOf(b.target))) {
      position(link.id).sourceY = y;
      y += link.value * scale;
    }
    y = node.y;
    for (const link of [...node.incoming].sort((a, b) => rowOf(a.source) - rowOf(b.source))) {
      position(link.id).targetY = y;
      y += link.value * scale;
    }
  }

  return {
    nodes: [...placed.values()],
    links: graph.links.map(link => ({ ...link, ...position(link.id), thickness: link.value * scale })),
    columns,
    labelWidths: columns.map(
      (_, step) => (step === columnCount - 1 ? lastColumnWidth : columnStep) - NODE_WIDTH - LABEL_GUTTER
    ),
    compact,
    scale,
    width: laidOutWidth,
    height: Math.max(0, ...columnBottoms),
    columnBottoms,
  };
}

/** Shortens a page to about `maxChars`, keeping both ends: the tail of a path says the most. */
export function truncateMiddle(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  if (maxChars <= 1) return "…";
  const keep = maxChars - 1;
  const head = Math.ceil(keep / 2);
  const tail = Math.floor(keep / 2);
  return `${text.slice(0, head)}…${tail > 0 ? text.slice(-tail) : ""}`;
}
