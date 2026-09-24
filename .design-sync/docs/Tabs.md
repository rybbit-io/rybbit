---
category: Navigation
---

Segmented tabs (Radix). A filled `TabsList` pill strip where the active `TabsTrigger` lifts to a darker surface; each `TabsContent` panel shows only while its `value` is active. Use it to switch between views of one thing (Overview / Sessions / Goals, Desktop / Mobile). For the lighter underline style used inside report cards use `BasicTabs`.

Parts: `Tabs` (root; `defaultValue` for uncontrolled, `value` / `onValueChange` for controlled) → `TabsList` (36px strip, `bg-neutral-800`, `inline-flex` by default; add `grid w-full grid-cols-N` to stretch triggers evenly) → `TabsTrigger` (`value`, `disabled`; active state is `bg-neutral-950` with bright text) and `TabsContent` (`value`; adds `mt-2`).

Conventions: 2-5 triggers, sentence-case labels, no icons. Keep the list left-aligned above its content; stretch it full-width only for two-way toggles. Disable a trigger for a feature the plan lacks rather than hiding it. Focus rings are keyboard-only and are not shown in the static preview.

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="sessions">Sessions</TabsTrigger>
    <TabsTrigger value="goals">Goals</TabsTrigger>
    <TabsTrigger value="replay" disabled>Replay</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    <div className="grid grid-cols-2 gap-3">{/* stat cards */}</div>
  </TabsContent>
  <TabsContent value="sessions">…</TabsContent>
  <TabsContent value="goals">…</TabsContent>
</Tabs>
```
