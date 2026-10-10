import { useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent } from "react";

type KeyInput = Pick<KeyboardEvent, "key" | "code" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">;

export const isApplePlatform = () => /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);

// The platform never changes, so there is nothing to subscribe to. The server
// snapshot is null: key hints render after hydration instead of guessing.
const subscribeToNothing = () => () => {};
const getServerPlatform = () => null;

/** True on Apple platforms (⌘), false elsewhere (Ctrl), null until hydrated. */
export function useApplePlatform(): boolean | null {
  return useSyncExternalStore<boolean | null>(subscribeToNothing, isApplePlatform, getServerPlatform);
}

/** ⌘K on Apple platforms, Ctrl+K elsewhere. */
export function isPaletteShortcut(event: KeyInput, apple: boolean): boolean {
  // Autofill fires keydown events without a key.
  if (typeof event.key !== "string" || event.altKey || event.shiftKey) return false;
  const modifier = apple ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  if (!modifier) return false;

  const key = event.key.toLowerCase();
  // Non-Latin layouts report their own letter as the key; fall back to the physical K there.
  return key === "k" || (!/^[a-z]$/.test(key) && event.code === "KeyK");
}

/** "?" (Shift+/ on US layouts, wherever the layout puts it otherwise). */
export function isShortcutSheetKey(event: KeyInput): boolean {
  return event.key === "?" && !event.metaKey && !event.ctrlKey && !event.altKey;
}

/** Same rule as the date preset hotkeys: typing into a field is never a shortcut. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** Embedded dashboards (iframes on other sites) get no global shortcuts. */
export const isEmbedView = () => new URLSearchParams(window.location.search).get("embed") === "true";

/**
 * Page shortcuts (date presets, replay seeking) listen on document and window.
 * React sees a key before those listeners do, so an open overlay stops plain
 * keys here and the page behind it stays put. Chords such as ⌘K still pass.
 */
export function keepKeysInOverlay(event: ReactKeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  event.nativeEvent.stopImmediatePropagation();
}

/**
 * Radix closes the overlay on Escape from a capture listener on document.
 * Stopping the event there keeps it from also reaching the dashboard editor's
 * Escape-to-cancel listener on window.
 */
export function keepEscapeInOverlay(event: KeyboardEvent) {
  event.stopPropagation();
}
