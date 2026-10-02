import type { Annotation, TimeBucket } from "@rybbit/shared";
import { DateTime } from "luxon";
import { shiftBuckets } from "@/components/charts/timeSeriesChartUtils";
import { parseAnnotationInstant } from "../../main/components/MainSection/annotations/annotationUtils";

/**
 * The annotations that touch the chart's window. The window ends with its last
 * bucket, not at that bucket's start, so a note from 2pm on the last day of a
 * daily chart still counts: the same rule the pins on the chart follow.
 */
export function annotationsInWindow(
  annotations: Annotation[],
  window: { min?: Date; max?: Date },
  bucket: TimeBucket,
  now: Date = new Date()
): Annotation[] {
  const windowEnd = shiftBuckets(DateTime.fromJSDate(window.max ?? now), bucket, 1).toJSDate();
  return annotations.filter(annotation => {
    const start = parseAnnotationInstant(annotation.date).toJSDate();
    const end = annotation.endDate ? parseAnnotationInstant(annotation.endDate).toJSDate() : start;
    return start < windowEnd && (window.min === undefined || end >= window.min);
  });
}
