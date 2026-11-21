"use client";

import { useExtracted } from "next-intl";
import {
  CUSTOM_RANGE_HOTKEY,
  HOTKEY_FOR_PRESET,
  PRESET_GROUPS,
  usePresetLabels,
} from "@/components/DateSelector/presets";
import { SKIP_SECONDS } from "@/components/replay/player/utils/replayUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isShortcutSheetKey, keepEscapeInOverlay, keepKeysInOverlay, useApplePlatform } from "./keys";
import { KeyCaps } from "./KeyCaps";
import { closeOverlay, restoreFocus, showOverlay } from "./store";

type Shortcut = { label: string; keys: string[] };

/** The "?" sheet: every keyboard shortcut in the app, read from the same constants the handlers use. */
export function ShortcutSheet({ open }: { open: boolean }) {
  const t = useExtracted();
  const presetLabels = usePresetLabels();
  const apple = useApplePlatform();
  const mod = apple === false ? t("Ctrl") : "⌘";
  const skipSeconds = String(SKIP_SECONDS / 1000);

  const general: Shortcut[] = [
    { label: t("Open command palette"), keys: [mod, "K"] },
    { label: t("Show keyboard shortcuts"), keys: ["?"] },
  ];
  const replay: Shortcut[] = [
    { label: t("Back {seconds} seconds", { seconds: skipSeconds }), keys: ["←"] },
    { label: t("Forward {seconds} seconds", { seconds: skipSeconds }), keys: ["→"] },
    { label: t("Play or pause"), keys: [t("Space")] },
  ];
  const dashboard: Shortcut[] = [
    { label: t("Save changes"), keys: [mod, "S"] },
    { label: t("Cancel editing"), keys: [t("Esc")] },
  ];
  // In menu order rather than key order, so the list reads like the date selector.
  const dateRange: Shortcut[] = [
    ...PRESET_GROUPS.flatMap(group => group.presets).flatMap(preset => {
      const hotkey = HOTKEY_FOR_PRESET[preset];
      return hotkey ? [{ label: presetLabels[preset], keys: [hotkey.toUpperCase()] }] : [];
    }),
    { label: t("Custom range"), keys: [CUSTOM_RANGE_HOTKEY.toUpperCase()] },
  ];

  return (
    <Dialog open={open} onOpenChange={next => (next ? showOverlay("shortcuts") : closeOverlay())}>
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[85dvh] max-w-2xl overflow-y-auto"
        onCloseAutoFocus={restoreFocus}
        onEscapeKeyDown={keepEscapeInOverlay}
        onKeyDown={event => {
          // "?" again closes the sheet.
          if (isShortcutSheetKey(event)) {
            event.preventDefault();
            closeOverlay();
          }
          keepKeysInOverlay(event);
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("Keyboard shortcuts")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
          <div className="space-y-6">
            <ShortcutSection title={t("General")} shortcuts={general} />
            <ShortcutSection title={t("Session replay")} shortcuts={replay} />
            <ShortcutSection title={t("Dashboard editing")} shortcuts={dashboard} />
          </div>
          <ShortcutSection title={t("Date range")} shortcuts={dateRange} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutSection({ title, shortcuts }: { title: string; shortcuts: Shortcut[] }) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">{title}</h3>
      <dl className="divide-y divide-neutral-100 dark:divide-neutral-850">
        {shortcuts.map(shortcut => (
          <div key={shortcut.label} className="flex items-center justify-between gap-4 py-1.5">
            <dt className="text-sm text-neutral-800 dark:text-neutral-200">{shortcut.label}</dt>
            <dd>
              <KeyCaps keys={shortcut.keys} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
