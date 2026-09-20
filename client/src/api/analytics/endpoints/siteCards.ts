export interface SiteCardMetrics {
  current: { sessions: number; users: number };
  previous: { sessions: number; users: number } | null;
  series: { time: string; sessions: number }[];
}

export type SiteCardsResponse = Record<number, SiteCardMetrics>;
