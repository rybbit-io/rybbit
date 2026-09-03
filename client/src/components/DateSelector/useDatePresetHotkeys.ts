import { useEffect } from "react";
import type { DashboardDefaultTimeRange } from "@/lib/defaultTimeRange";
import { CUSTOM_RANGE_HOTKEY, PRESET_HOTKEYS, type PresetHotkey } from "./presets";

type Handlers = {
  onPreset: (preset: DashboardDefaultTimeRange) => void;
  onCustom: () => void;
  /** Presets the caller has hidden, so their keys fall through untouched. */
  enabled: (preset: DashboardDefaultTimeRange) => boolean;
};

/**
 * Only the most recently mounted selector answers a key. Pages mount exactly
 * one, but a dialog that stacks its own on top of the page's must not apply
 * the same preset twice — the newest one wins, and the older resumes when it
 * unmounts.
 */
const stack: Handlers[] = [];

const isTyping = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

const onKeyDown = (event: KeyboardEvent) => {
  if (event.defaultPrevented || event.repeat) return;
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  if (isTyping(event.target)) return;

  const handlers = stack[stack.length - 1];
  if (!handlers) return;

  const key = event.key.toLowerCase();
  if (key === CUSTOM_RANGE_HOTKEY) {
    event.preventDefault();
    handlers.onCustom();
    return;
  }

  const preset = key in PRESET_HOTKEYS ? PRESET_HOTKEYS[key as PresetHotkey] : undefined;
  if (!preset || !handlers.enabled(preset)) return;

  event.preventDefault();
  handlers.onPreset(preset);
};

export function useDatePresetHotkeys(handlers: Handlers | null) {
  useEffect(() => {
    if (!handlers) return;

    stack.push(handlers);
    if (stack.length === 1) document.addEventListener("keydown", onKeyDown);

    return () => {
      stack.splice(stack.indexOf(handlers), 1);
      if (stack.length === 0) document.removeEventListener("keydown", onKeyDown);
    };
  }, [handlers]);
}
