import { rank, type RankItem } from "./rank";

type GroupedItem = RankItem & { group: string };

export type PaletteEntry<T extends GroupedItem> = { kind: "heading"; group: T["group"] } | { kind: "row"; item: T };

type Options<G extends string> = {
  /** Most rows a group shows before the user types. Typing searches every row. */
  groupLimits?: Partial<Record<G, number>>;
  /** Most rows a search renders. */
  maxResults?: number;
};

/**
 * What the palette lists for `query`. With no query, the rows keep their
 * registry order under a heading per group; `items` must already be ordered
 * group by group. With a query, one flat list ranked best first. `total`
 * counts every match, including rows past `maxResults`.
 */
export function paletteEntries<T extends GroupedItem>(
  items: readonly T[],
  query: string,
  { groupLimits = {}, maxResults = Infinity }: Options<T["group"]> = {}
): { entries: PaletteEntry<T>[]; total: number } {
  if (query.trim()) {
    const ranked = rank(items, query);
    return {
      entries: ranked.slice(0, maxResults).map(item => ({ kind: "row", item })),
      total: ranked.length,
    };
  }

  const limits: Partial<Record<string, number>> = groupLimits;
  const entries: PaletteEntry<T>[] = [];
  const shown = new Map<string, number>();

  for (const item of items) {
    const count = shown.get(item.group) ?? 0;
    if (count >= (limits[item.group] ?? Infinity)) continue;
    if (count === 0) entries.push({ kind: "heading", group: item.group });
    entries.push({ kind: "row", item });
    shown.set(item.group, count + 1);
  }

  return { entries, total: items.length };
}
