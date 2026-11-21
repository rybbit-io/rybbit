---
category: Feedback
---

Inline, non-dismissing status message that lives in the page flow (a settings panel, the top of a report, an onboarding step). Use it for state the user needs to see when they arrive: tracking detected, a plan limit approaching, a failed verification. For a transient confirmation after an action use `Toaster`/`toast`; for something that must be acknowledged use `AlertDialog`.

Parts: `Alert` (root, `role="alert"`, full width, 4.8px radius, 16px/12px padding, tinted fill) → a lucide icon as the first child (absolutely positioned top-left, 16px, tinted to the variant; the text shifts right 28px automatically) → `AlertTitle` (14px medium, one line) → `AlertDescription` (14px, wraps; nested `<p>` get relaxed leading, so an action row can follow the text).

Variants (`variant` on `Alert`): `default` (neutral-800 fill, gray icon) · `info` (blue tint) · `success` (emerald tint) · `warning` (yellow tint) · `destructive` (red tint). There is no border; the hue is carried by the 12-15% tint and the icon only, so the alert sits flat on the panel like everything else in the instrument. Title in sentence case, description says the consequence or the next step; title-only and description-only are both fine for one-liners. Give the icon `className="h-4 w-4"`.

```tsx
import { Alert, AlertDescription, AlertTitle } from "@rybbit/ui";
import { AlertTriangle } from "lucide-react";

<Alert variant="warning">
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>Approaching your event limit</AlertTitle>
  <AlertDescription>You have used 91% of 1M monthly events. Upgrade to keep collecting after the cap.</AlertDescription>
</Alert>
```
