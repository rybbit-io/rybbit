// The names table's optional columns give way as the card narrows; the expanded
// row carries what they held. Container widths, not viewport ones: the sidebar
// takes a varying share of the window.
export const COLUMN = {
  users: "hidden @min-[480px]:table-cell",
  trend: "hidden @min-[640px]:table-cell",
  change: "hidden @min-[640px]:table-cell",
  lastSeen: "hidden @min-[760px]:table-cell",
  perUser: "hidden @min-[840px]:table-cell",
  people: "hidden @min-[930px]:table-cell",
  usedIn: "hidden @min-[1120px]:table-cell",
};

// The same thresholds as numbers. Keep the two in step.
const COLUMN_MIN_WIDTH: Record<keyof typeof COLUMN, number> = {
  users: 480,
  trend: 640,
  change: 640,
  lastSeen: 760,
  perUser: 840,
  people: 930,
  usedIn: 1120,
};

// Event and Events are always there.
const ALWAYS_VISIBLE_COLUMNS = 2;

/**
 * How many columns are on show at a card width. The expanded row spans exactly
 * that many: a fixed-layout table makes a column for every one a cell spans,
 * so spanning the hidden ones too would squeeze the name column to make room.
 *
 * The change column is only rendered while a comparison is on. An unmeasured
 * card (null) counts every column.
 */
export const visibleColumnCount = (containerWidth: number | null, hasChangeColumn = true) =>
  ALWAYS_VISIBLE_COLUMNS +
  Object.entries(COLUMN_MIN_WIDTH).filter(
    ([column, minWidth]) =>
      (column !== "change" || hasChangeColumn) && (containerWidth === null || containerWidth >= minWidth)
  ).length;
