---
category: Navigation
---

Underline tabs (Radix), the quiet sibling of `Tabs`. There is no filled strip: triggers are muted text sitting on a transparent 32px row, and the active one turns bright with a 2px bottom border. Use it inside cards and section headers to switch a breakdown (Countries / Regions / Cities, Channels / Referrers) where a pill strip would be too heavy; use `Tabs` for top-level view switching.

Parts (exported with the `BasicTabs` prefix because the source file shares names with `tabs.tsx`): `BasicTabs` (root; `defaultValue` or `value` / `onValueChange`) → `BasicTabsList` (`inline-flex` row with 12px gaps) → `BasicTabsTrigger` (`value`, `disabled`) and `BasicTabsContent` (`value`; adds `mt-2`).

Conventions: short one-word labels; an optional count after the label as `<span className="ml-1 text-xs text-neutral-500 tabular-nums">48</span>`; keep the list flush-left with the card's content edge. Never mix `BasicTabs` and `Tabs` parts in one tree.

```tsx
<BasicTabs defaultValue="countries">
  <BasicTabsList>
    <BasicTabsTrigger value="countries">Countries</BasicTabsTrigger>
    <BasicTabsTrigger value="regions">Regions</BasicTabsTrigger>
    <BasicTabsTrigger value="cities">Cities</BasicTabsTrigger>
  </BasicTabsList>
  <BasicTabsContent value="countries">{/* ranked list */}</BasicTabsContent>
  <BasicTabsContent value="regions">…</BasicTabsContent>
  <BasicTabsContent value="cities">…</BasicTabsContent>
</BasicTabs>
```
