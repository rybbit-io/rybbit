---
category: Forms
---

Form label built on Radix Label: 14px, medium weight, `leading-none`, inherits the foreground color. Always wire it to its control with `htmlFor` + `id` so clicking the text focuses the input or toggles the checkbox/switch. It is the only text style for field names; helper text below a field is a plain `p.text-xs.text-neutral-400`.

Parts: `Label` only. Forwards every native `<label>` prop and `className`.

Conventions:
- Above a field: `grid gap-1.5` with `Label` first, then `Input` / `Textarea` / `Select`.
- Beside a toggle: `flex items-center gap-2` with the `Checkbox` / `RadioGroupItem` / `Switch` first, then the `Label`. For lists of options use `className="font-normal"` so only the group heading is medium.
- When the control has `peer` and is `disabled`, the label auto-fades to 70% (`peer-disabled:opacity-70`); otherwise add `className="opacity-70"` yourself.
- Required marker: `<span className="text-red-400">*</span>` inside the label. A trailing hint sits on the same row with `flex items-baseline justify-between`.

```tsx
<div className="grid gap-1.5">
  <Label htmlFor="site-name">Site name</Label>
  <Input id="site-name" defaultValue="rybbit.com" />
  <p className="text-xs text-neutral-400">Shown in the site switcher.</p>
</div>

<div className="flex items-center gap-2">
  <Checkbox id="exclude-bots" defaultChecked />
  <Label htmlFor="exclude-bots">Exclude known bots</Label>
</div>
```
