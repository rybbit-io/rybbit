---
category: Actions
---

Joins adjacent `Button`s (and inputs/select triggers) into one control: inner corners are squared and the shared border is collapsed so a Day/Week/Month switch, a zoom toolbar or a split "range + chevron" trigger reads as a single piece of chrome. Use it whenever two or more related actions sit flush; use plain `flex gap-2` for unrelated buttons.

Parts: `ButtonGroup` (root, `role="group"`, `flex w-fit items-stretch`; `orientation="horizontal"` (default) removes left borders/radii between children, `"vertical"` stacks them and removes the top ones) → children are ordinary `Button`s. `ButtonGroupSeparator` is a hairline `Separator` (neutral-800, stretches to the group height) for splitting clusters inside one group. `ButtonGroupText` is a static label cell with the same height and border (neutral-800 fill; `asChild` to render it as a label or link); put a lucide icon first and it is sized to 16px. Nesting a `ButtonGroup` directly inside a `ButtonGroup` inserts an 8px gap between the clusters, which is how you build a filter bar.

Conventions: members share one `size` (`sm` for filter chips, `icon` for tool rails). Use `variant="outline"` for the members and `variant="default"` (the raised neutral-850 chrome) for the selected one; `accent` only for the single primary action at the end of a group. `buttonGroupVariants` is exported if you need the classes on a custom element.

```tsx
import { Button, ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "@rybbit/ui";
import { Calendar, ChevronDown, Download } from "lucide-react";

<ButtonGroup>
  <Button variant="outline" size="sm">Day</Button>
  <Button variant="default" size="sm">Week</Button>
  <Button variant="outline" size="sm">Month</Button>
</ButtonGroup>

<ButtonGroup>
  <ButtonGroupText><Calendar /> Last 30 days</ButtonGroupText>
  <Button variant="outline" aria-label="Change range"><ChevronDown /></Button>
  <ButtonGroupSeparator />
  <Button variant="outline"><Download /> Export</Button>
</ButtonGroup>
```
