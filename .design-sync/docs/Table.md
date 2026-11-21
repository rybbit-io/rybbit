---
category: Data display
---

Data table for dense analytics lists. Parts: `Table` (scroll wrapper + `<table>`) → `TableHeader` (neutral-850 band) → `TableRow` → `TableHead`; `TableBody` → `TableRow` → `TableCell`; optional `TableFooter` (totals) and `TableCaption` (below the table, muted). `TableSortIndicator` renders the sort chevrons for a sortable column: `sortDirection="asc" | "desc"` shows a blue arrow, `undefined` shows the neutral double chevron, `canSort={false}` hides it.

Conventions: 14px text, 8px cell padding, hairline row borders, no zebra striping. Right-align numeric columns and add `tabular-nums`. Keep the first column a name/path in `font-medium`. Use `Badge` for status cells and `Skeleton` rows while loading.

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Page</TableHead>
      <TableHead className="text-right">Visitors <TableSortIndicator sortDirection="desc" /></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="font-medium">/pricing</TableCell>
      <TableCell className="text-right tabular-nums">6,120</TableCell>
    </TableRow>
  </TableBody>
</Table>
```
