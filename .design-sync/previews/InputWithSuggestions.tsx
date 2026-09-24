import * as React from "react";
import { InputWithSuggestions, Label } from "@rybbit/ui";

const pages = [
  { value: "/pricing", count: 6120 },
  { value: "/pricing/compare", count: 1840 },
  { value: "/docs/script", count: 4890 },
  { value: "/blog/session-replay", count: 2310 },
  { value: "/signup", count: 1975 },
];

/**
 * Canonical: the list opens on focus, so the preview focuses the input after mount. Suggestions
 * filter by substring of the typed value; the right column is the compact event count.
 */
export function PagePathOpen() {
  const [value, setValue] = React.useState("/pri");
  const input = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.focus();
    el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  }, []);
  return (
    <div className="p-4 w-96">
      <Label className="mb-1.5 block">Page path</Label>
      <InputWithSuggestions
        ref={input}
        value={value}
        onValueChange={setValue}
        suggestions={pages}
        placeholder="/checkout"
      />
    </div>
  );
}

/** Closed states: empty with placeholder, filled, and disabled. */
export function ClosedStates() {
  return (
    <div className="p-4 w-96 flex flex-col gap-3">
      <InputWithSuggestions suggestions={pages} placeholder="Match a page path" />
      <InputWithSuggestions suggestions={pages} value="/docs/script" onValueChange={() => {}} />
      <InputWithSuggestions suggestions={pages} value="/signup" onValueChange={() => {}} disabled />
    </div>
  );
}
