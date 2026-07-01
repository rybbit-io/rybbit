// Maps raw rrweb protocol events into human-meaningful session events
// (clicks, navigations, typing, rage clicks, console errors) and, for the
// technical view, groups consecutive low-level events of the same kind.
//
// rrweb reference:
//   type 2 FullSnapshot · 3 IncrementalSnapshot · 4 Meta · 6 Plugin
//   incremental source: 0 Mutation · 1 MouseMove · 2 MouseInteraction · 3 Scroll
//     · 4 ViewportResize · 5 Input · 6 TouchMove · 7 MediaInteraction
//     · 8 StyleSheetRule · 9 CanvasMutation · 10 Font · 11 Log · 12 Drag
//     · 13 StyleDeclaration · 14 Selection · 15 AdoptedStyleSheet
//   MouseInteraction data.type: 2 Click · 3 ContextMenu · 4 DblClick

export type MeaningfulKind =
  | "session-start"
  | "navigation"
  | "click"
  | "dblclick"
  | "rightclick"
  | "rageclick"
  | "input"
  | "console"
  | "resize";

export type EventSeverity = "default" | "info" | "warn" | "error";

export interface MeaningfulEvent {
  key: string;
  kind: MeaningfulKind;
  /** Absolute rrweb timestamp of the event (or first event in a group). */
  timestamp: number;
  /** Milliseconds from the start of the recording. */
  offset: number;
  /** Number of underlying events represented (typing keystrokes, rage clicks). */
  count: number;
  severity: EventSeverity;
  /** Optional secondary text: a path, the clicked element, a typed field, a log. */
  detail?: string;
  /** Click coordinates, kept for rage-click proximity detection. */
  x?: number;
  y?: number;
}

interface RawEvent {
  timestamp: number;
  type: string | number;
  data?: any;
}

// ---------------------------------------------------------------------------
// DOM resolution: map a clicked node id back to a human label by walking the
// FullSnapshot tree plus any nodes added by later mutations.
// ---------------------------------------------------------------------------

interface SNode {
  id?: number;
  type?: number; // 2 Element, 3 Text
  tagName?: string;
  attributes?: Record<string, unknown>;
  childNodes?: SNode[];
  textContent?: string;
}

interface NodeIndex {
  byId: Map<number, SNode>;
  parent: Map<number, number>;
}

const INTERACTIVE_TAGS = new Set(["a", "button", "input", "select", "textarea", "label", "summary", "option"]);
const INTERACTIVE_ROLES = new Set(["button", "link", "tab", "menuitem", "checkbox", "switch", "radio", "option"]);

function buildNodeIndex(events: RawEvent[]): NodeIndex {
  const byId = new Map<number, SNode>();
  const parent = new Map<number, number>();

  const walk = (node: SNode | undefined, parentId: number | null) => {
    if (!node || typeof node.id !== "number") return;
    byId.set(node.id, node);
    if (parentId !== null) parent.set(node.id, parentId);
    if (Array.isArray(node.childNodes)) {
      for (const child of node.childNodes) walk(child, node.id);
    }
  };

  for (const ev of events) {
    const type = Number(ev.type);
    if (type === 2 && ev.data?.node) {
      walk(ev.data.node, null);
    } else if (type === 3 && ev.data?.source === 0 && Array.isArray(ev.data?.adds)) {
      for (const add of ev.data.adds) {
        walk(add?.node, typeof add?.parentId === "number" ? add.parentId : null);
      }
    }
  }

  return { byId, parent };
}

function truncate(value: string, max = 40): string {
  const t = value.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function collectText(node: SNode | undefined, budget: { left: number }): string {
  if (!node || budget.left <= 0) return "";
  if (node.type === 3) {
    const text = (node.textContent || "").replace(/\s+/g, " ");
    budget.left -= text.length;
    return text;
  }
  let out = "";
  if (Array.isArray(node.childNodes)) {
    for (const child of node.childNodes) {
      out += collectText(child, budget);
      if (budget.left <= 0) break;
    }
  }
  return out;
}

function isInteractive(node: SNode): boolean {
  const tag = (node.tagName || "").toLowerCase();
  if (INTERACTIVE_TAGS.has(tag)) return true;
  const attrs = node.attributes || {};
  if (attrs.role && INTERACTIVE_ROLES.has(String(attrs.role))) return true;
  return attrs.onclick !== undefined || attrs.href !== undefined;
}

function elementLabel(node: SNode): string | undefined {
  const attrs = node.attributes || {};
  const tag = (node.tagName || "").toLowerCase();

  const aria = attrs["aria-label"] || attrs.title || attrs.alt;
  if (aria) return `“${truncate(String(aria))}”`;

  if (tag === "input") {
    const itype = String(attrs.type || "text").toLowerCase();
    if (itype === "submit" || itype === "button") {
      return attrs.value ? `“${truncate(String(attrs.value))}”` : "button";
    }
    const name = attrs.placeholder || attrs.name || attrs.id;
    return name ? `${itype} field “${truncate(String(name))}”` : `${itype} field`;
  }
  if (tag === "img") return attrs.alt ? `image “${truncate(String(attrs.alt))}”` : "image";

  const text = truncate(collectText(node, { left: 80 }));
  if (text) return `“${text}”`;

  if (attrs.id) return `${tag || "element"}#${attrs.id}`;
  if (attrs.class) {
    const first = String(attrs.class).split(/\s+/).filter(Boolean)[0];
    if (first) return `${tag || "element"}.${first}`;
  }
  return tag || undefined;
}

/** Resolve a node id to the nearest interactive element (climbing a few levels). */
function resolveElement(id: unknown, index: NodeIndex): SNode | undefined {
  if (typeof id !== "number") return undefined;
  let node = index.byId.get(id);
  if (!node) return undefined;

  // A click often lands on a text node or a child span; climb to its parent first.
  if (node.type === 3) {
    const pid = index.parent.get(id);
    node = pid !== undefined ? index.byId.get(pid) : undefined;
  }
  if (!node) return undefined;

  let cur: SNode | undefined = node;
  let curId: number | undefined = typeof node.id === "number" ? node.id : undefined;
  for (let i = 0; i < 5 && cur; i++) {
    if (isInteractive(cur)) return cur;
    if (curId === undefined) break;
    const pid = index.parent.get(curId);
    if (pid === undefined) break;
    cur = index.byId.get(pid);
    curId = pid;
  }
  return node;
}

function describeTarget(id: unknown, index: NodeIndex): string | undefined {
  const node = resolveElement(id, index);
  return node ? elementLabel(node) : undefined;
}

function describeField(id: unknown, index: NodeIndex): string | undefined {
  if (typeof id !== "number") return undefined;
  const node = index.byId.get(id);
  if (!node) return undefined;
  const attrs = node.attributes || {};
  const name = attrs["aria-label"] || attrs.placeholder || attrs.name || attrs.id;
  return name ? truncate(String(name)) : undefined;
}

const RAGE_CLICK_WINDOW_MS = 1000;
const RAGE_CLICK_MIN = 3;
const RAGE_CLICK_RADIUS = 50;
const INPUT_GROUP_GAP_MS = 2000;

function pathFromUrl(url: unknown): string | undefined {
  if (typeof url !== "string" || !url) return undefined;
  try {
    const u = new URL(url);
    return (u.pathname || "/") + u.search + u.hash;
  } catch {
    return url;
  }
}

function consoleSeverity(level: unknown): EventSeverity {
  if (level === "error" || level === "assert") return "error";
  if (level === "warn") return "warn";
  return "info";
}

/**
 * Reduce raw rrweb events to the events a human cares about, in order.
 * Rage clicks are derived from click clusters; consecutive keystrokes into the
 * same field collapse into a single "typed" event.
 */
export function getMeaningfulEvents(events: RawEvent[] | undefined): MeaningfulEvent[] {
  if (!events || events.length === 0) return [];

  const first = events[0].timestamp;
  const index = buildNodeIndex(events);
  const out: MeaningfulEvent[] = [];
  let metaSeen = false;
  // Track the current path so repeated Meta events for the same URL (rrweb emits
  // one per recording chunk / heartbeat) don't show up as phantom navigations.
  let currentPath: string | undefined;

  // Open input group we may keep extending.
  let openInput: { ev: MeaningfulEvent; lastTs: number; targetId: unknown } | null = null;
  const closeInput = () => {
    openInput = null;
  };

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const type = Number(ev.type);
    const offset = ev.timestamp - first;

    // Meta (type 4): the first one is the session start, the rest are navigations.
    if (type === 4 && ev.data?.href) {
      closeInput();
      const detail = pathFromUrl(ev.data.href);
      if (!metaSeen) {
        metaSeen = true;
        currentPath = detail;
        out.push({
          key: `start-${ev.timestamp}`,
          kind: "session-start",
          timestamp: ev.timestamp,
          offset,
          count: 1,
          severity: "default",
          detail,
        });
      } else if (detail !== currentPath) {
        currentPath = detail;
        out.push({
          key: `nav-${ev.timestamp}-${i}`,
          kind: "navigation",
          timestamp: ev.timestamp,
          offset,
          count: 1,
          severity: "default",
          detail,
        });
      }
      // Same URL as before → redundant Meta (chunk boundary / heartbeat), skip.
      continue;
    }

    // Console / log plugin (type 6).
    if (type === 6 && (ev.data?.plugin === "rrweb/console@1" || ev.data?.payload?.level)) {
      closeInput();
      const level = ev.data?.payload?.level;
      const payload = ev.data?.payload?.payload;
      const detail = Array.isArray(payload)
        ? payload
            .map((p: unknown) => (typeof p === "string" ? p.replace(/^"|"$/g, "") : String(p)))
            .join(" ")
            .slice(0, 200)
        : undefined;
      out.push({
        key: `console-${ev.timestamp}-${i}`,
        kind: "console",
        timestamp: ev.timestamp,
        offset,
        count: 1,
        severity: consoleSeverity(level),
        detail,
      });
      continue;
    }

    if (type !== 3) continue;
    const source = ev.data?.source;

    // Console via incremental Log (source 11).
    if (source === 11) {
      closeInput();
      out.push({
        key: `log-${ev.timestamp}-${i}`,
        kind: "console",
        timestamp: ev.timestamp,
        offset,
        count: 1,
        severity: consoleSeverity(ev.data?.level),
      });
      continue;
    }

    // Input (source 5): collapse a run of keystrokes into one "typed" event.
    if (source === 5) {
      const targetId = ev.data?.id;
      if (openInput && openInput.targetId === targetId && ev.timestamp - openInput.lastTs <= INPUT_GROUP_GAP_MS) {
        openInput.ev.count += 1;
        openInput.lastTs = ev.timestamp;
      } else {
        const me: MeaningfulEvent = {
          key: `input-${ev.timestamp}-${i}`,
          kind: "input",
          timestamp: ev.timestamp,
          offset,
          count: 1,
          severity: "default",
          detail: describeField(targetId, index),
        };
        out.push(me);
        openInput = { ev: me, lastTs: ev.timestamp, targetId };
      }
      continue;
    }

    // Mouse interaction (source 2): clicks only.
    if (source === 2) {
      const interaction = Number(ev.data?.type);
      const x = typeof ev.data?.x === "number" ? ev.data.x : undefined;
      const y = typeof ev.data?.y === "number" ? ev.data.y : undefined;
      const target = describeTarget(ev.data?.id, index);
      if (interaction === 2) {
        closeInput();
        out.push({
          key: `click-${ev.timestamp}-${i}`,
          kind: "click",
          timestamp: ev.timestamp,
          offset,
          count: 1,
          severity: "default",
          detail: target,
          x,
          y,
        });
      } else if (interaction === 4) {
        closeInput();
        out.push({
          key: `dbl-${ev.timestamp}-${i}`,
          kind: "dblclick",
          timestamp: ev.timestamp,
          offset,
          count: 1,
          severity: "default",
          detail: target,
          x,
          y,
        });
      } else if (interaction === 3) {
        closeInput();
        out.push({
          key: `ctx-${ev.timestamp}-${i}`,
          kind: "rightclick",
          timestamp: ev.timestamp,
          offset,
          count: 1,
          severity: "default",
          detail: target,
          x,
          y,
        });
      }
      continue;
    }

    // Viewport resize (source 4) is intentionally excluded from the key view:
    // mobile browsers fire it constantly as the URL bar shows/hides. It stays
    // available in the technical view.
  }

  return collapseRageClicks(dedupeConsecutive(out));
}

/** Drop adjacent duplicate events (overlapping storage chunks repeat events). */
function dedupeConsecutive(events: MeaningfulEvent[]): MeaningfulEvent[] {
  const out: MeaningfulEvent[] = [];
  for (const e of events) {
    const prev = out[out.length - 1];
    if (prev && prev.kind === e.kind && prev.detail === e.detail && e.timestamp - prev.timestamp <= 100) {
      continue;
    }
    out.push(e);
  }
  return out;
}

/** Collapse 3+ near-simultaneous, co-located clicks into a single rage click. */
function collapseRageClicks(events: MeaningfulEvent[]): MeaningfulEvent[] {
  const result: MeaningfulEvent[] = [];
  let i = 0;

  const coords = (e: MeaningfulEvent): [number, number] | null =>
    typeof e.x === "number" && typeof e.y === "number" ? [e.x, e.y] : null;

  while (i < events.length) {
    const e = events[i];
    if (e.kind !== "click") {
      result.push(e);
      i++;
      continue;
    }

    // Grow a cluster of clicks within the time + distance window.
    let j = i + 1;
    const anchor = coords(e);
    while (j < events.length && events[j].kind === "click" && events[j].timestamp - events[i].timestamp <= RAGE_CLICK_WINDOW_MS) {
      const c = coords(events[j]);
      if (anchor && c && Math.hypot(c[0] - anchor[0], c[1] - anchor[1]) > RAGE_CLICK_RADIUS) break;
      j++;
    }

    const clusterSize = j - i;
    if (clusterSize >= RAGE_CLICK_MIN) {
      result.push({
        ...e,
        key: `rage-${e.timestamp}`,
        kind: "rageclick",
        count: clusterSize,
        severity: "warn",
      });
      i = j;
    } else {
      result.push(e);
      i++;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Technical view: the raw rrweb stream, grouped by consecutive type/source.
// ---------------------------------------------------------------------------

const INCREMENTAL_TYPES: Record<number, string> = {
  0: "Mutation",
  1: "Mouse Move",
  2: "Mouse Interaction",
  3: "Scroll",
  4: "Viewport Resize",
  5: "Input",
  6: "Touch Move",
  7: "Media Interaction",
  8: "Style Sheet Rule",
  9: "Canvas Mutation",
  10: "Font",
  11: "Log",
  12: "Drag",
  13: "Style Declaration",
  14: "Selection",
  15: "Adopted Style Sheet",
};

const EVENT_TYPE_NAMES: Record<number, string> = {
  0: "DOM Content Loaded",
  1: "Load",
  2: "Full Snapshot",
  3: "Incremental",
  4: "Meta",
  5: "Custom",
  6: "Plugin",
};

export interface TechnicalGroup {
  key: string;
  label: string;
  /** Underlying incremental source (for icon selection), if any. */
  source?: number;
  type: number;
  timestamp: number;
  offset: number;
  endOffset: number;
  count: number;
}

export function getTechnicalGroups(events: RawEvent[] | undefined): TechnicalGroup[] {
  if (!events || events.length === 0) return [];
  const first = events[0].timestamp;
  const groups: TechnicalGroup[] = [];
  let current: (TechnicalGroup & { _src?: number }) | null = null;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const type = Number(ev.type);
    const source = type === 3 ? ev.data?.source : undefined;

    const sameAsCurrent = current && current.type === type && current._src === source && type === 3;

    if (sameAsCurrent && current) {
      current.count += 1;
      current.endOffset = ev.timestamp - first;
    } else {
      if (current) groups.push(current);
      const label: string =
        type === 3 && source !== undefined
          ? INCREMENTAL_TYPES[source] ?? `Source ${source}`
          : EVENT_TYPE_NAMES[type] ?? `Type ${type}`;
      current = {
        key: `${ev.timestamp}-${i}`,
        label,
        source,
        _src: source,
        type,
        timestamp: ev.timestamp,
        offset: ev.timestamp - first,
        endOffset: ev.timestamp - first,
        count: 1,
      };
    }
  }
  if (current) groups.push(current);
  return groups;
}
