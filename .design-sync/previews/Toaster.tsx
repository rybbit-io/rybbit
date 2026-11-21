import * as React from "react";
import { Button, Toaster, toast } from "@rybbit/ui";

/** Fire once on mount (guards StrictMode double-invoke) so the toast is on screen at capture time. */
function useFireOnce(fire: () => void) {
  const fired = React.useRef(false);
  React.useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** A settings panel for context; the Toaster is mounted once, at the app root, and renders bottom-right. */
function Stage() {
  return (
    <div className="p-4">
      <div className="w-96 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <div className="text-sm font-medium">Site settings</div>
        <div className="mt-1 text-sm text-neutral-400">tomato.gg · Pro plan · bot filtering on</div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm">Cancel</Button>
          <Button variant="accent" size="sm">Save changes</Button>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

/** Canonical: `toast.success(message)` after a save. Emerald check, neutral-850 card, bottom-right. */
export function Success() {
  useFireOnce(() => toast.success("Settings saved for tomato.gg"));
  return <Stage />;
}

/** `toast.error(message)` for a failed request; the copy says what to do next. */
export function Failure() {
  useFireOnce(() => toast.error("Couldn't verify rybbit.com. Check the TXT record and try again."));
  return <Stage />;
}

/** Plain `toast(message)`, `toast.info(message)` and a success stacked newest-on-bottom. */
export function Stacked() {
  useFireOnce(() => {
    toast("CSV export started for the last 30 days");
    toast.info("2 sites have not sent an event this week");
    toast.success("Goal “Signup completed” created");
  });
  return <Stage />;
}
