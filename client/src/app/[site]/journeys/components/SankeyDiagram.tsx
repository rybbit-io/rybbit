"use client";

import { useMeasure } from "@uidotdev/usehooks";
import { ArrowRight } from "lucide-react";
import { useExtracted } from "next-intl";
import { useRouter } from "next/navigation";
import { MouseEvent, ReactNode, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  buildSankeyGraph,
  connectedLinkIds,
  formatShare,
  LaidOutLink,
  LaidOutNode,
  layoutSankey,
  linkId,
  NODE_WIDTH,
  nodeId,
  pathKey,
  truncateMiddle,
} from "./journeyUtils";

interface Journey {
  path: string[];
  count: number;
  percentage: number;
}

export interface SankeyStepHeader {
  /** Zero-based step. */
  index: number;
  /** Sessions on the shown paths at this step. */
  sessions: number;
  /** The same for the step before; null on the first step. */
  previousSessions: number | null;
  /** Horizontal room the header has before the next column starts. */
  width: number;
}

interface SankeyDiagramProps {
  journeys: Journey[];
  steps: number;
  maxJourneys: number;
  domain: string;
  /** Drawn at full strength through the diagram, the rest faded. Must be one of `journeys`. */
  pinnedPath?: string[] | null;
  /** Makes bars and bands clickable: called with the largest shown path through the one clicked. */
  onPinPath?: (path: string[]) => void;
  /** False when paths are cut at an end page rather than where the session ended: no exit shares. */
  exitsKnown?: boolean;
  /** Drawn above each column, aligned with it. */
  renderStepHeader?: (step: SankeyStepHeader) => ReactNode;
  /**
   * Where a page name leads, inside the app; `undefined` for a name that is
   * not a page. Without this prop a name opens the page itself in a new tab.
   */
  pageHref?: (page: string) => string | undefined;
  /** Docked under the right-hand columns, or below the diagram when it is narrow. */
  overlay?: ReactNode;
}

type Hover = { kind: "node"; id: string } | { kind: "link"; id: string };

const DATA_COLOR = "hsl(var(--dataviz))";
const LABEL_OFFSET = NODE_WIDTH + 8;
// Average advance of a 12px Inter glyph in a path: labels are cut by character count.
const LABEL_CHAR_WIDTH = 6.4;
const OVERLAY_WIDTH = 488;
// Below this the diagram has no free corner wide enough for the overlay.
const OVERLAY_DOCK_MIN_WIDTH = 880;
const HALO = "stroke-white dark:stroke-neutral-900";

const bandPath = (link: LaidOutLink, source: LaidOutNode, target: LaidOutNode, thickness: number) => {
  const x0 = source.x + NODE_WIDTH;
  const x1 = target.x;
  const y0 = link.sourceY + thickness / 2;
  const y1 = link.targetY + thickness / 2;
  const curve = (x1 - x0) * 0.42;
  return `M${x0},${y0.toFixed(1)}C${(x0 + curve).toFixed(1)},${y0.toFixed(1)} ${(x1 - curve).toFixed(1)},${y1.toFixed(1)} ${x1},${y1.toFixed(1)}`;
};

export function SankeyDiagram({
  journeys,
  steps,
  maxJourneys,
  domain,
  pinnedPath,
  onPinPath,
  exitsKnown = true,
  renderStepHeader,
  pageHref,
  overlay,
}: SankeyDiagramProps) {
  const t = useExtracted();
  const router = useRouter();
  const [measureRef, { width: containerWidth }] = useMeasure<HTMLDivElement>();
  const [overlayRef, { height: overlayHeight }] = useMeasure<HTMLDivElement>();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const shown = useMemo(() => journeys.slice(0, maxJourneys), [journeys, maxJourneys]);
  const graph = useMemo(() => buildSankeyGraph(shown, steps, exitsKnown), [shown, steps, exitsKnown]);
  const layout = useMemo(
    () => (containerWidth ? layoutSankey(graph, steps, containerWidth) : null),
    [graph, steps, containerWidth]
  );

  const nodesById = useMemo(() => new Map(layout?.nodes.map(node => [node.id, node])), [layout]);
  const linksById = useMemo(() => new Map(layout?.links.map(link => [link.id, link])), [layout]);

  // The pinned path's own sessions through each of its links.
  const pinned = useMemo(() => {
    if (!pinnedPath) return null;
    const key = pathKey(pinnedPath);
    const journey = shown.find(candidate => pathKey(candidate.path) === key);
    if (!journey) return null;
    const path = journey.path.slice(0, steps);
    return {
      count: journey.count,
      nodes: new Set(path.map((name, step) => nodeId(step, name))),
      links: new Set(path.slice(1).map((name, index) => linkId(nodeId(index, path[index]), nodeId(index + 1, name)))),
    };
  }, [pinnedPath, shown, steps]);

  const highlighted = useMemo(() => {
    if (!hover) return null;
    const start =
      hover.kind === "link"
        ? graph.links.filter(link => link.id === hover.id)
        : graph.links.filter(link => link.source === hover.id || link.target === hover.id);
    const links = connectedLinkIds(graph, start);
    const nodes = new Set<string>(hover.kind === "node" ? [hover.id] : []);
    for (const link of graph.links) {
      if (!links.has(link.id)) continue;
      nodes.add(link.source);
      nodes.add(link.target);
    }
    return { links, nodes };
  }, [hover, graph]);

  if (!journeys || !domain) return null;

  const moveTooltip = (event: MouseEvent) => {
    const tooltip = tooltipRef.current;
    const frame = tooltip?.offsetParent;
    if (!tooltip || !frame) return;
    const bounds = frame.getBoundingClientRect();
    const x = event.clientX - bounds.left + 12;
    const y = event.clientY - bounds.top - 12;
    // Keep it inside the diagram instead of under the cursor at the right edge.
    const overflow = Math.max(0, x + tooltip.offsetWidth - bounds.width);
    tooltip.style.transform = `translate(${x - overflow}px, ${y}px) translateY(-100%)`;
  };

  const pin = (path: string[] | undefined) => {
    if (path && onPinPath) onPinPath(path);
  };
  const largestThroughNode = (node: LaidOutNode) => shown.find(journey => journey.path[node.step] === node.name)?.path;
  const largestThroughLink = (source: LaidOutNode, target: LaidOutNode) =>
    shown.find(journey => journey.path[source.step] === source.name && journey.path[target.step] === target.name)?.path;

  // The overlay docks in the free corner below the right-hand columns: every
  // column whose labels or incoming bands would run under it sets how far down.
  const dockOverlay = !!overlay && !!layout && layout.width >= OVERLAY_DOCK_MIN_WIDTH;
  let overlayTop = 0;
  if (dockOverlay && layout) {
    const overlayLeft = layout.width - OVERLAY_WIDTH;
    layout.columns.forEach((x, step) => {
      const labelsReach = x + LABEL_OFFSET + layout.labelWidths[step] > overlayLeft;
      const bandsReach = step + 1 < layout.columns.length && layout.columns[step + 1] > overlayLeft;
      if (labelsReach || bandsReach) overlayTop = Math.max(overlayTop, layout.columnBottoms[step] + 16);
    });
  }
  const svgHeight = layout ? Math.max(layout.height, dockOverlay ? overlayTop + (overlayHeight ?? 0) : 0) + 4 : 160;

  const pinnedThickness = pinned && layout ? Math.max(1.5, pinned.count * layout.scale) : 0;

  const hoveredNode = hover?.kind === "node" ? nodesById.get(hover.id) : undefined;
  const hoveredLink = hover?.kind === "link" ? linksById.get(hover.id) : undefined;
  const hoveredLinkSource = hoveredLink && nodesById.get(hoveredLink.source);
  const hoveredLinkTarget = hoveredLink && nodesById.get(hoveredLink.target);

  const nodeMeta = (node: LaidOutNode) => {
    const count = node.count.toLocaleString();
    // The entry column says what the figures count; the others repeat only the number.
    if (node.step === 0 && !node.exits) return t("{count} sessions", { count });
    if (node.exits === null) return count;
    if (node.exits === 0) return t("{count} · all continue", { count });
    return t("{count} · {percent} end here", { count, percent: formatShare(node.exits / node.count, 0) });
  };

  return (
    <>
      <div ref={measureRef} className="w-full overflow-x-auto">
        {layout ? (
          <div className="relative" style={{ width: layout.width }} onMouseLeave={() => setHover(null)}>
            {renderStepHeader && (
              <div className="relative mb-2 h-7">
                {layout.columns.map((x, index) => (
                  <div key={index} className="absolute top-0 flex h-7 items-center gap-2" style={{ left: x }}>
                    {renderStepHeader({
                      index,
                      sessions: graph.stepTotals[index] ?? 0,
                      previousSessions: index === 0 ? null : (graph.stepTotals[index - 1] ?? 0),
                      width: (layout.columns[index + 1] ?? layout.width) - x,
                    })}
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <svg
                width={layout.width}
                height={svgHeight}
                className="block"
                role="img"
                aria-label={t("Sankey diagram of the top {count} paths from session start, {steps} steps deep", {
                  count: String(shown.length),
                  steps: String(steps),
                })}
              >
                {layout.links.map(link => {
                  const source = nodesById.get(link.source);
                  const target = nodesById.get(link.target);
                  if (!source || !target) return null;
                  const opacity = highlighted ? (highlighted.links.has(link.id) ? 0.45 : 0.07) : pinned ? 0.14 : 0.2;
                  return (
                    <path
                      key={link.id}
                      d={bandPath(link, source, target, link.thickness)}
                      fill="none"
                      stroke={DATA_COLOR}
                      strokeWidth={Math.max(1, link.thickness)}
                      opacity={opacity}
                      className="transition-opacity duration-150"
                    />
                  );
                })}
                {pinned &&
                  layout.links.map(link => {
                    const source = nodesById.get(link.source);
                    const target = nodesById.get(link.target);
                    if (!pinned.links.has(link.id) || !source || !target) return null;
                    return (
                      <path
                        key={link.id}
                        d={bandPath(link, source, target, pinnedThickness)}
                        fill="none"
                        stroke={DATA_COLOR}
                        strokeWidth={pinnedThickness}
                        opacity={highlighted && !highlighted.links.has(link.id) ? 0.35 : 0.9}
                        className="transition-opacity duration-150"
                      />
                    );
                  })}

                {/* Invisible, wider hit areas so thin bands can be hovered. Bars and labels are drawn over them. */}
                {layout.links.map(link => {
                  const source = nodesById.get(link.source);
                  const target = nodesById.get(link.target);
                  if (!source || !target) return null;
                  return (
                    <path
                      key={link.id}
                      d={bandPath(link, source, target, link.thickness)}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={Math.max(link.thickness, 12)}
                      className={onPinPath ? "cursor-pointer" : undefined}
                      onMouseEnter={event => {
                        setHover({ kind: "link", id: link.id });
                        moveTooltip(event);
                      }}
                      onMouseMove={moveTooltip}
                      onClick={() => pin(largestThroughLink(source, target))}
                    />
                  );
                })}

                {layout.nodes.map(node => {
                  const dimmed = highlighted ? !highlighted.nodes.has(node.id) : false;
                  const isPinned = !!pinned?.nodes.has(node.id);
                  const exitShare = node.exits ? node.exits / node.count : 0;
                  const continuedHeight = node.height * (1 - exitShare);
                  // A pinned band leaving from the top of the bar would run under the label.
                  const pinnedBandOnTop =
                    !!pinned &&
                    node.outgoing.some(link => pinned.links.has(link.id) && linksById.get(link.id)?.sourceY === node.y);
                  const labelY = node.y + (pinnedBandOnTop ? pinnedThickness + 3 : 0);
                  const maxChars = Math.max(6, Math.floor(layout.labelWidths[node.step] / LABEL_CHAR_WIDTH));
                  const count = node.count.toLocaleString();
                  const name = layout.compact
                    ? truncateMiddle(node.name, Math.max(6, maxChars - count.length - 1))
                    : truncateMiddle(node.name, maxChars);
                  const href = pageHref ? pageHref(node.name) : `https://${domain}${node.name}`;
                  const nameText = (
                    <text
                      x={node.x + LABEL_OFFSET}
                      y={labelY + 11}
                      fontSize={12}
                      fontWeight={isPinned ? 600 : 500}
                      paintOrder="stroke"
                      strokeWidth={4}
                      strokeLinejoin="round"
                      className={cn(
                        HALO,
                        "sankey-node-name",
                        isPinned ? "fill-neutral-950 dark:fill-neutral-50" : "fill-neutral-800 dark:fill-neutral-200"
                      )}
                    >
                      {name}
                      {layout.compact && (
                        <tspan dx={6} fontSize={11} fontWeight={400} className="fill-neutral-500 dark:fill-neutral-400">
                          {count}
                        </tspan>
                      )}
                    </text>
                  );

                  return (
                    <g
                      key={node.id}
                      opacity={dimmed ? 0.25 : 1}
                      className="transition-opacity duration-150"
                      onMouseEnter={event => {
                        setHover({ kind: "node", id: node.id });
                        moveTooltip(event);
                      }}
                      onMouseMove={moveTooltip}
                    >
                      <g
                        onClick={() => pin(largestThroughNode(node))}
                        className={onPinPath ? "cursor-pointer" : undefined}
                      >
                        {/* Wider than the bar, so a thin one is still easy to hit. */}
                        <rect
                          x={node.x - 4}
                          y={node.y}
                          width={NODE_WIDTH + 8}
                          height={node.height}
                          fill="transparent"
                        />
                        {continuedHeight > 0.2 && (
                          <rect
                            x={node.x}
                            y={node.y}
                            width={NODE_WIDTH}
                            height={continuedHeight}
                            rx={2}
                            fill={DATA_COLOR}
                          />
                        )}
                        {exitShare > 0 && (
                          <rect
                            x={node.x}
                            y={node.y + continuedHeight}
                            width={NODE_WIDTH}
                            height={node.height - continuedHeight}
                            rx={2}
                            className="fill-neutral-300 dark:fill-neutral-600"
                          />
                        )}
                      </g>
                      {href ? (
                        <a
                          href={href}
                          className="[&:hover_.sankey-node-name]:underline"
                          {...(pageHref
                            ? {
                                onClick: (event: MouseEvent) => {
                                  // Keep the browser's own handling for new-tab clicks.
                                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                                  event.preventDefault();
                                  router.push(href);
                                },
                              }
                            : { target: "_blank", rel: "noopener noreferrer" })}
                        >
                          {nameText}
                        </a>
                      ) : (
                        nameText
                      )}
                      {!layout.compact && (
                        <text
                          x={node.x + LABEL_OFFSET}
                          y={labelY + 26}
                          fontSize={11}
                          paintOrder="stroke"
                          strokeWidth={4}
                          strokeLinejoin="round"
                          className={cn(HALO, "fill-neutral-500 dark:fill-neutral-400")}
                        >
                          {nodeMeta(node)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
              {dockOverlay && (
                <div
                  ref={overlayRef}
                  className="absolute right-0"
                  style={{ top: overlayTop, width: OVERLAY_WIDTH }}
                  onMouseEnter={() => setHover(null)}
                >
                  {overlay}
                </div>
              )}
            </div>

            <div
              ref={tooltipRef}
              role="tooltip"
              className={cn(
                "pointer-events-none absolute left-0 top-0 z-10 max-w-xs rounded-md border border-neutral-100 bg-white px-2.5 py-2 text-xs text-neutral-900 shadow-lg dark:border-neutral-750 dark:bg-neutral-800 dark:text-neutral-50",
                !hoveredNode && !hoveredLink && "invisible"
              )}
            >
              {hoveredNode && (
                <>
                  <div className="break-all font-medium">{hoveredNode.name}</div>
                  <div className="mt-1 tabular-nums text-neutral-600 dark:text-neutral-300">
                    {t("{count} sessions · {percent} of sessions with 2+ pages", {
                      count: hoveredNode.count.toLocaleString(),
                      percent: `${hoveredNode.percentage.toFixed(1)}%`,
                    })}
                  </div>
                  {!!hoveredNode.exits && (
                    <div className="tabular-nums text-neutral-600 dark:text-neutral-300">
                      {t("{count} ended the session here ({percent})", {
                        count: hoveredNode.exits.toLocaleString(),
                        percent: formatShare(hoveredNode.exits / hoveredNode.count),
                      })}
                    </div>
                  )}
                </>
              )}
              {hoveredLink && hoveredLinkSource && hoveredLinkTarget && (
                <>
                  <div className="flex flex-wrap items-center gap-1 break-all font-medium">
                    {hoveredLinkSource.name}
                    <ArrowRight
                      className="h-3 w-3 shrink-0 text-neutral-500 dark:text-neutral-400"
                      aria-hidden="true"
                    />
                    {hoveredLinkTarget.name}
                  </div>
                  <div className="mt-1 tabular-nums text-neutral-600 dark:text-neutral-300">
                    {t("{count} sessions · {percent} of those on {page} at step {step}", {
                      count: hoveredLink.value.toLocaleString(),
                      percent: formatShare(hoveredLink.value / hoveredLinkSource.count),
                      page: hoveredLinkSource.name,
                      step: String(hoveredLinkSource.step + 1),
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="h-40" />
        )}
      </div>
      {overlay && !dockOverlay && <div className="mt-3">{overlay}</div>}
    </>
  );
}
