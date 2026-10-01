export interface TraitKey {
  key: string;
  userCount: number;
}

export interface TraitKeysResponse {
  keys: TraitKey[];
}

// Totals for a set of users. Sessions, pageviews and events are sums.
export interface TraitGroupStats {
  users: number;
  sessions: number;
  pageviews: number;
  events: number;
}

export interface TraitValueGroup extends TraitGroupStats {
  value: string;
}

// The period's users grouped by one trait. Every user is in exactly one of
// groups, other or none.
export interface TraitBreakdown {
  key: string;
  // Too many identified users were active to join to their traits; the rest is empty
  limited: boolean;
  limit: number;
  totals: (TraitGroupStats & { identified: number }) | null;
  // The largest values, by users
  groups: TraitValueGroup[];
  // Every value past the largest ones, together
  other: (TraitGroupStats & { values: number }) | null;
  // Users with no value for the key: anonymous, or identified without it
  none: TraitGroupStats | null;
  searchLimited?: boolean;
}
