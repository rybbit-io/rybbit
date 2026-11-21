---
category: Forms
---

Radix checkbox, 16px square, 4.8px radius. Unchecked: 1px `neutral-700` border on a faint `neutral-900/30` fill. Checked: emerald (`accent-500`) border and fill with a white lucide `Check`. Focus shows a 3px emerald ring. Use it for independent on/off choices in a list (columns to include, sites to notify, filters to apply); use `Switch` for a single setting that applies immediately, and `RadioGroup` for mutually exclusive options.

Parts: `Checkbox` only (indicator is internal). Props: `checked` / `defaultChecked`, `onCheckedChange`, `disabled`, `id`, `name`, `className`.

Conventions:
- Always give it an `id` and a sibling `Label htmlFor` in a `flex items-center gap-2` row; the label toggles it.
- With a description: `flex items-start gap-3`, add `className="mt-0.5"` to the checkbox so it aligns with the first text line, and put the description in `text-xs text-neutral-400`.
- Option lists live in a `grid gap-2.5` inside a `rounded-lg border border-neutral-800 bg-neutral-900 p-4` panel with a `text-sm font-medium` heading; option labels use `font-normal`.
- `disabled` fades the box to 50%; add `opacity-70` to its label. Hover and indeterminate are not shown in the previews.

```tsx
<div className="flex items-center gap-2">
  <Checkbox id="exclude-bots" defaultChecked />
  <Label htmlFor="exclude-bots">Exclude known bots</Label>
</div>

<div className="flex items-start gap-3">
  <Checkbox id="salt" className="mt-0.5" />
  <div className="grid gap-1">
    <Label htmlFor="salt">Salt user IDs daily</Label>
    <p className="text-xs text-neutral-400">Returning-visitor stats reset at midnight UTC.</p>
  </div>
</div>
```
