import { MonitorEvent } from "@/api/uptime/monitors";

export interface TimingSegment {
  label: string;
  time: number | undefined;
  color: string;
}

export const TIMING_COLORS = {
  dns: "bg-emerald-500",     // Green - similar to hsl(160, 70%, 50%)
  tcp: "bg-teal-500",         // Turquoise - similar to hsl(180, 70%, 45%)
  tls: "bg-sky-500",          // Light Blue - similar to hsl(200, 70%, 45%)
  ttfb: "bg-blue-500",        // Blue - for TTFB (not in chart but fits the gradient)
  transfer: "bg-indigo-500",  // Deeper Blue - similar to hsl(220, 70%, 50%)
} as const;

export function getTimingSegments(event: MonitorEvent): TimingSegment[] {
  return [
    { label: "DNS", time: event.dns_time_ms, color: TIMING_COLORS.dns },
    { label: "TCP", time: event.tcp_time_ms, color: TIMING_COLORS.tcp },
    { label: "TLS", time: event.tls_time_ms, color: TIMING_COLORS.tls },
    { label: "TTFB", time: event.ttfb_ms, color: TIMING_COLORS.ttfb },
    { label: "Transfer", time: event.transfer_time_ms, color: TIMING_COLORS.transfer },
  ].filter((t) => t.time && t.time > 0);
}

export function calculateTimingMetrics(timings: TimingSegment[], totalTime: number) {
  const sumOfTimings = timings.reduce((sum, t) => sum + (t.time || 0), 0);
  const needsNormalization = sumOfTimings > totalTime;

  return {
    sumOfTimings,
    needsNormalization,
  };
}

export function calculateSegmentWidth(
  timing: TimingSegment,
  totalTime: number,
  sumOfTimings: number,
  needsNormalization: boolean
): number {
  if (!timing.time) return 0;

  return needsNormalization ? (timing.time / sumOfTimings) * 100 : (timing.time / totalTime) * 100;
}

export function renderTimingSegments(
  timings: TimingSegment[],
  totalTime: number,
  renderSegment: (
    segment: TimingSegment,
    props: {
      left: number;
      width: number;
      zIndex: number;
      index: number;
    }
  ) => React.ReactNode
): React.ReactNode[] {
  const { sumOfTimings, needsNormalization } = calculateTimingMetrics(timings, totalTime);

  let left = 0;
  return timings.map((timing, index) => {
    const width = calculateSegmentWidth(timing, totalTime, sumOfTimings, needsNormalization);
    const adjustedWidth = Math.min(width, 100 - left);

    const element = renderSegment(timing, {
      left,
      width: adjustedWidth,
      zIndex: timings.length - index,
      index,
    });

    left += adjustedWidth;
    return element;
  });
}
