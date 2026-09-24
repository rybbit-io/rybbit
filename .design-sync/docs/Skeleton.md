---
category: Data display
---

Loading placeholder. `Skeleton` is a single `div` with `animate-pulse`, 2.8px radius, and a neutral-850 fill (one step above the card surface); it has no intrinsic size, so every instance needs a height and width class. Compose skeletons to mirror the shape of the content they replace — the layout should not jump when real data lands.

Conventions:
- Stat tile: keep the real label, replace the figure with `h-9 w-[60px]` and the delta with `h-5 w-[50px]` (this is exactly what the overview does).
- Table / list: one `h-4` bar per row, `flex-1` for the name column and a fixed `w-12` for the figure column; 5-6 rows.
- Text: `h-5` for a title, `h-4 w-full` body lines, make the last line shorter (`w-64`).
- Avatar: `h-8 w-8 rounded-full`.
- Put skeletons inside the same `Card` / `CardContent` the data will use; for an in-place refetch over existing data use `CardLoader` instead.

```tsx
<Card>
  <div className="flex flex-col px-3 py-2">
    <div className="text-xs font-medium text-muted-foreground">Unique visitors</div>
    <div className="flex items-center justify-between">
      <Skeleton className="h-9 w-[60px] rounded-md" />
      <Skeleton className="h-5 w-[50px] rounded-md" />
    </div>
  </div>
</Card>
```
