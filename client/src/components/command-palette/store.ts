import { create } from "zustand";

export type PaletteOverlay = "palette" | "shortcuts";

// One overlay at a time: the palette can hand over to the shortcut sheet and back.
export const usePaletteOverlay = create<{ overlay: PaletteOverlay | null }>(() => ({ overlay: null }));

// What had focus before the first overlay opened. Radix Dialog only returns
// focus to a Dialog.Trigger, and these overlays open from the keyboard.
let returnFocus: HTMLElement | null = null;

export function showOverlay(overlay: PaletteOverlay) {
  const current = usePaletteOverlay.getState().overlay;
  if (current === overlay) return;

  if (current === null) {
    const active = document.activeElement;
    returnFocus = active instanceof HTMLElement && active !== document.body ? active : null;
  }
  usePaletteOverlay.setState({ overlay });
}

export function closeOverlay() {
  usePaletteOverlay.setState({ overlay: null });
}

export function openCommandPalette() {
  showOverlay("palette");
}

/** `onCloseAutoFocus` for both overlays: focus goes back where it was, unless the other overlay took over. */
export function restoreFocus(event: Event) {
  event.preventDefault();
  if (usePaletteOverlay.getState().overlay !== null) return;

  const target = returnFocus;
  returnFocus = null;
  if (target?.isConnected) target.focus({ preventScroll: true });
}
