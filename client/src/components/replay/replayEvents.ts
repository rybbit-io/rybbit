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
  /** Optional secondary text: a path, a typed-into field, a console message. */
  detail?: string;
}

interface RawEvent {
  timestamp: number;
  type: string | number;
  data?: any;
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
        };
        out.push(me);
        openInput = { ev: me, lastTs: ev.timestamp, targetId };
      }
      continue;
    }

    // Mouse interaction (source 2): clicks only.
    if (source === 2) {
      const interaction = Number(ev.data?.type);
      if (interaction === 2) {
        closeInput();
        out.push({
          key: `click-${ev.timestamp}-${i}`,
          kind: "click",
          timestamp: ev.timestamp,
          offset,
          count: 1,
          severity: "default",
          detail: typeof ev.data?.x === "number" ? `${Math.round(ev.data.x)}, ${Math.round(ev.data.y)}` : undefined,
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

  const coords = (e: MeaningfulEvent): [number, number] | null => {
    if (!e.detail) return null;
    const [x, y] = e.detail.split(",").map(s => Number(s.trim()));
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
  };

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
        detail: undefined,
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
