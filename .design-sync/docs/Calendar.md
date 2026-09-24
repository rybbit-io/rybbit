---
category: Forms
---

Month-grid date picker (react-day-picker v9) that lives inside the date-range popover and any "pick a day" dialog. One component plus its day cell: `Calendar` (all DayPicker props pass through) and `CalendarDayButton` (the `ghost`/`icon` Button used per day, swappable via `components`). Key props: `mode="single"` with `selected: Date` / `onSelect(date)`, or `mode="range"` with `selected: { from, to }` / `onSelect(range)`; `defaultMonth` (always set it so the render is deterministic); `disabled` (a matcher such as `{ after: new Date() }` to block future days); `captionLayout="label"` (default, static "May 2024") or `"dropdown"` (month + year selects, needs `startMonth`/`endMonth`); `numberOfMonths={2}` for a side-by-side range picker; `showOutsideDays` (default true).

Appearance: a `w-fit` neutral-850 panel with 12px padding and 32px cells (`--cell-size`), muted weekday letters, the selected day as a light (neutral-200) pill with dark text, today as a neutral-700 pill, range middles as a continuous neutral-700 band with square inner corners, disabled days at 50% opacity. Inside a `PopoverContent` or `CardContent` the panel background goes transparent to sit on the host. Keep it for picking days; pair it with the preset range list (Last 7/30/90 days) rather than replacing it, and use `Input type="time"` for times.

```tsx
const [range, setRange] = React.useState<{ from?: Date; to?: Date }>();

<Calendar
  mode="range"
  selected={range}
  onSelect={setRange}
  defaultMonth={new Date(2024, 4, 1)}
  disabled={{ after: new Date() }}
  numberOfMonths={2}
/>
```
