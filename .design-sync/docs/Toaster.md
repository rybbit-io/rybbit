---
category: Feedback
---

Transient confirmations after an action ("Settings saved", "Couldn't verify domain"). Mount ONE `<Toaster />` at the app root (it is a configured react-hot-toast host: bottom-right, neutral-850 card with neutral-200 text in dark mode, 4.8px radius, 14px medium) and fire messages from anywhere with the `toast` function. Toasts stack newest at the bottom and auto-dismiss (success ~2s, default/error ~4s), so keep the message to one line that reads on its own. For state that must persist on the page use `Alert`; for something the user must acknowledge use `AlertDialog`.

Parts: `Toaster` (the host, no props) and `toast` (the API). The API takes a plain string: `toast(message)` (no icon), `toast.success(message)` (emerald check), `toast.error(message)` (red cross), `toast.info(message)` (an "i" glyph), `toast.dismiss(id?)` (dismiss one or all), `toast.custom(node, opts)` (escape hatch for a fully custom body). Every call returns the toast id.

Conventions: one toast per user action; name the object ("Goal “Signup completed” created", "Settings saved for tomato.gg"); an error says what to do next. Never use a toast for validation (that belongs in `FormMessage`) or for anything the user has to read later.

```tsx
import { Button, Toaster, toast } from "@rybbit/ui";

// once, at the root
<Toaster />

// anywhere
<Button
  variant="accent"
  onClick={async () => {
    try {
      await saveSettings();
      toast.success("Settings saved for tomato.gg");
    } catch {
      toast.error("Couldn't save settings. Try again.");
    }
  }}
>
  Save changes
</Button>
```
