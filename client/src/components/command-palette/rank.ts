// Adapted from interior.dev "Command Palette" (MIT). See ../interior/THIRD_PARTY_LICENSES.md

// A match right after one of these counts as the start of a word.
const BOUNDARY = /[\s\-_/.:]/;
// Combining marks left behind by NFD normalization ("é" → "e" + U+0301).
const DIACRITICS = /[̀-ͯ]/g;

export type RankItem = {
  label: string;
  /** Extra words to match; a hit here scores a little below the same hit in the label. */
  keywords?: string;
};

/**
 * Case- and accent-insensitive form of a label or query, so "ubersicht" finds
 * "Übersicht" in the translated UI.
 */
export function fold(text: string): string {
  return text.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
}

/**
 * Scores `query` (already folded) against `text` as an in-order subsequence.
 * Every query character must appear after the previous one; consecutive runs,
 * a match at the very start and matches at word starts earn more. Returns -1
 * when the text does not contain the query.
 */
export function scoreOne(text: string, query: string): number {
  const folded = fold(text);
  let cursor = 0;
  let total = 0;
  let streak = 0;

  for (let i = 0; i < query.length; i++) {
    const at = folded.indexOf(query[i], cursor);
    if (at < 0) return -1;
    streak = at === cursor && i > 0 ? streak + 1 : 0;
    total += 2 + streak * 4;
    if (at === 0) total += 12;
    else if (BOUNDARY.test(folded[at - 1])) total += 8;
    cursor = at + 1;
  }

  return total;
}

/**
 * The items that match `query`, best first. A label hit beats the same hit in
 * the keywords, a shorter label wins a tie, and equal scores keep their input
 * order. An empty query returns every item in its original order.
 */
export function rank<T extends RankItem>(items: readonly T[], query: string): T[] {
  const q = fold(query.trim());
  if (!q) return [...items];

  const scored: { item: T; score: number; order: number }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const direct = scoreOne(item.label, q);
    const aliased = item.keywords ? scoreOne(item.keywords, q) - 3 : -1;
    const best = Math.max(direct, aliased);
    if (best < 0) continue;
    scored.push({ item, score: best - item.label.length * 0.05, order: i });
  }

  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  return scored.map(entry => entry.item);
}
