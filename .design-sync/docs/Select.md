---
category: Forms
---

Single-value dropdown (Radix Select) for picking one option from a short, known list: time range, site, timezone, metric. Compose the flat parts: `Select` (root; `value`/`defaultValue`, `onValueChange`, `open`, `disabled`) → `SelectTrigger` (the 36px bordered field; `size="sm"` for the 28px toolbar variant) containing `SelectValue` (shows the chosen item's text or its `placeholder`) → `SelectContent` (portalled popper list, dark neutral-800 panel; pass the same `size`) → `SelectItem` (`value` required; the chosen one shows an emerald check on the right; `disabled` dims it). Group with `SelectGroup` + `SelectLabel` heading and separate groups with `SelectSeparator`. `SelectScrollUpButton` / `SelectScrollDownButton` are already inside `SelectContent`.

Conventions: the trigger is `w-full` by default, so size it with the parent. Keep `size` consistent across Trigger/Content/Item/Label. Use Select when there are 3-12 mutually exclusive options; for 2 options use a `RadioGroup` or `Switch`, for many searchable options use `MultiSelect`/`Command`, for free text with hints use `InputWithSuggestions`. Inside a `Form`, wrap the `SelectTrigger` in `FormControl` and bind `value={field.value} onValueChange={field.onChange}`.

```tsx
<Select defaultValue="7d" onValueChange={setRange}>
  <SelectTrigger>
    <SelectValue placeholder="Pick a range" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Recent</SelectLabel>
      <SelectItem value="24h">Last 24 hours</SelectItem>
      <SelectItem value="7d">Last 7 days</SelectItem>
      <SelectItem value="30d">Last 30 days</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectItem value="all">All time</SelectItem>
  </SelectContent>
</Select>
```
