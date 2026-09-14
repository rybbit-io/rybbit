---
category: Forms
---

Radix radio group for one-of-N choices that need every option visible (retention period, chart interval, visitor scope). Items are 16px circles: 1px `neutral-700` border when idle, emerald (`accent-500`) fill with a white dot when selected, 3px emerald focus ring. Use `Select` instead when there are more than ~5 options or space is tight; use `Checkbox` when choices are independent.

Parts:
- `RadioGroup` — the root (`grid gap-2` by default). Props: `value` / `defaultValue`, `onValueChange`, `disabled`, `name`, `className`.
- `RadioGroupItem` — one option. Props: `value` (required), `id`, `disabled`, `className`. Indicator is internal.

Conventions:
- Each item sits in a `flex items-center gap-2` row with a `Label htmlFor` matching its `id`; option labels use `className="font-normal"`, the group heading is `text-sm font-medium` above.
- Horizontal: `<RadioGroup className="flex gap-4">` for short enums like hour / day / week.
- With descriptions: `flex items-start gap-3`, `className="mt-0.5"` on the item, description in `text-xs text-neutral-400`.
- `disabled` on an item fades it to 50%; add `opacity-70` to that label.

```tsx
<RadioGroup defaultValue="365">
  <div className="flex items-center gap-2">
    <RadioGroupItem value="90" id="r-90" />
    <Label htmlFor="r-90" className="font-normal">90 days</Label>
  </div>
  <div className="flex items-center gap-2">
    <RadioGroupItem value="365" id="r-365" />
    <Label htmlFor="r-365" className="font-normal">1 year</Label>
  </div>
</RadioGroup>
```
