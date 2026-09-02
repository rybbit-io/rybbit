"use client";

import type { Annotation } from "@rybbit/shared";
import { StickyNote } from "lucide-react";
import { useMemo } from "react";
import type { TimeSeriesOverlayContext } from "@/components/charts/TimeSeriesChart";
import { annotationColor, clusterAnnotations, type AnnotationCluster, type PositionedAnnotation } from "./annotationUtils";

const PIN_RADIUS = 11;
// Pins closer than this merge into one counted pin.
const CLUSTER_GAP = 26;

export function AnnotationPins({
  context,
  annotations,
  selectedKey,
  onSelect,
  onHover,
}: {
  context: TimeSeriesOverlayContext;
  annotations: Annotation[];
  selectedKey: string | null;
  onSelect: (cluster: AnnotationCluster, anchor: DOMRect) => void;
  onHover: (cluster: AnnotationCluster | null, anchor?: DOMRect) => void;
}) {
  const { xScale, yScale, plotLeft, plotRight, plotTop, plotBottom, pointAt, isDark } = context;

  const clusters = useMemo(() => {
    const [min, max] = xScale.domain();
    const positioned: PositionedAnnotation[] = [];
    for (const annotation of annotations) {
      const start = new Date(annotation.date);
      const end = annotation.endDate ? new Date(annotation.endDate) : null;
      if (start > max || (end ?? start) < min) continue;
      // A range that began before the visible window pins at the left edge.
      const anchor = start < min ? min : start;
      const point = pointAt(anchor);
      positioned.push({
        annotation,
        x: Math.max(plotLeft, Math.min(plotRight, xScale(anchor))),
        x2: end ? Math.max(plotLeft, Math.min(plotRight, xScale(end))) : null,
        y: point ? yScale(point.y) : plotBottom,
      });
    }
    return clusterAnnotations(positioned, CLUSTER_GAP);
  }, [annotations, xScale, yScale, pointAt, plotLeft, plotRight, plotBottom]);

  if (!clusters.length) return null;

  const pinFill = isDark ? "hsl(var(--neutral-900))" : "white";
  const badgeFill = isDark ? "hsl(var(--neutral-50))" : "hsl(var(--neutral-900))";
  const badgeText = isDark ? "hsl(var(--neutral-900))" : "white";

  return (
    <g>
      {clusters.map(cluster => {
        const first = cluster.items[0].annotation;
        const single = cluster.items.length === 1;
        const color = annotationColor(single ? first.color : null, isDark);
        const selected = cluster.key === selectedKey;
        const r = selected ? PIN_RADIUS + 1 : PIN_RADIUS;
        // Sit above the data point; clamp so a pin on the peak stays inside the plot.
        const pinY = Math.max(plotTop + r + 1, cluster.y - r - 9);
        const label = single ? first.title : `${cluster.items.length} annotations`;
        // The count badge hangs off the top-right of the pin; near the right
        // edge it would leave the SVG, so it flips to the top-left.
        const badgeX = cluster.x + r + 6 > plotRight ? cluster.x - r + 2 : cluster.x + r - 2;
        return (
          <g key={cluster.key}>
            {cluster.items
              .filter(item => item.x2 !== null)
              .map(item => {
                const bandColor = annotationColor(item.annotation.color, isDark);
                const width = Math.max(0, (item.x2 ?? item.x) - item.x);
                return (
                  <g key={item.annotation.annotationId} pointerEvents="none">
                    <rect x={item.x} y={plotTop} width={width} height={plotBottom - plotTop} fill={bandColor} opacity={0.08} />
                    <rect x={item.x} y={plotTop} width={width} height={2} fill={bandColor} />
                  </g>
                );
              })}
            <g
              role="button"
              aria-label={label}
              style={{ cursor: "pointer" }}
              onClick={e => {
                e.stopPropagation();
                onSelect(cluster, e.currentTarget.getBoundingClientRect());
              }}
              onMouseEnter={e => onHover(cluster, e.currentTarget.getBoundingClientRect())}
              onMouseLeave={() => onHover(null)}
            >
              <line x1={cluster.x} x2={cluster.x} y1={pinY + r} y2={cluster.y - 2} stroke={color} strokeWidth={1.5} />
              <circle cx={cluster.x} cy={cluster.y} r={2.5} fill={color} />
              <circle cx={cluster.x} cy={pinY} r={r} fill={pinFill} stroke={color} strokeWidth={selected ? 2 : 1.5} />
              {first.icon ? (
                <text x={cluster.x} y={pinY} dy="0.36em" textAnchor="middle" fontSize={11.5} pointerEvents="none">
                  {first.icon}
                </text>
              ) : (
                <StickyNote x={cluster.x - 6} y={pinY - 6} width={12} height={12} color={color} strokeWidth={2} pointerEvents="none" />
              )}
              {!single && (
                <g pointerEvents="none">
                  <circle cx={badgeX} cy={pinY - r + 2} r={7} fill={badgeFill} />
                  <text
                    x={badgeX}
                    y={pinY - r + 2}
                    dy="0.35em"
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={600}
                    fill={badgeText}
                  >
                    {cluster.items.length}
                  </text>
                </g>
              )}
            </g>
          </g>
        );
      })}
    </g>
  );
}
