/** Marker colors an annotation may use. `null` renders the neutral default. */
export const ANNOTATION_COLORS = ["amber", "rose", "sky", "violet", "lime"] as const;
export type AnnotationColor = (typeof ANNOTATION_COLORS)[number];

export interface Annotation {
  annotationId: number;
  /** Null for organization-wide annotations, which appear on every site in the organization. */
  siteId: number | null;
  organizationId: string;
  userId: string | null;
  userName: string | null;
  title: string;
  description: string | null;
  /** ISO 8601 timestamp. */
  date: string;
  /** ISO 8601 timestamp; set when the annotation spans a range. */
  endDate: string | null;
  color: AnnotationColor | null;
  /** Short emoji or symbol shown in the pin. */
  icon: string | null;
  /** Public annotations are visible on public dashboards and private-link views. */
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AnnotationScope = "site" | "organization";
