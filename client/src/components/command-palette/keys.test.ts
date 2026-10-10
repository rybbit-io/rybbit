import { describe, expect, it } from "vitest";
import { isPaletteShortcut, isShortcutSheetKey } from "./keys";

const key = (init: Partial<KeyboardEvent>) =>
  ({ key: "", code: "", metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...init }) as KeyboardEvent;

describe("isPaletteShortcut", () => {
  it("is ⌘K on Apple platforms", () => {
    expect(isPaletteShortcut(key({ key: "k", code: "KeyK", metaKey: true }), true)).toBe(true);
    expect(isPaletteShortcut(key({ key: "k", code: "KeyK", ctrlKey: true }), true)).toBe(false);
  });

  it("is Ctrl+K elsewhere", () => {
    expect(isPaletteShortcut(key({ key: "k", code: "KeyK", ctrlKey: true }), false)).toBe(true);
    expect(isPaletteShortcut(key({ key: "k", code: "KeyK", metaKey: true }), false)).toBe(false);
  });

  it("ignores K alone and K with extra modifiers", () => {
    expect(isPaletteShortcut(key({ key: "k", code: "KeyK" }), true)).toBe(false);
    expect(isPaletteShortcut(key({ key: "K", code: "KeyK", metaKey: true, shiftKey: true }), true)).toBe(false);
    expect(isPaletteShortcut(key({ key: "˚", code: "KeyK", metaKey: true, altKey: true }), true)).toBe(false);
    expect(isPaletteShortcut(key({ key: "k", code: "KeyK", metaKey: true, ctrlKey: true }), true)).toBe(false);
  });

  it("accepts caps lock", () => {
    expect(isPaletteShortcut(key({ key: "K", code: "KeyK", metaKey: true }), true)).toBe(true);
  });

  it("follows the layout's letter, falling back to the physical key on non-Latin layouts", () => {
    // Russian: the K key types л.
    expect(isPaletteShortcut(key({ key: "л", code: "KeyK", ctrlKey: true }), false)).toBe(true);
    // Dvorak: the K key types t, and k lives on the V key.
    expect(isPaletteShortcut(key({ key: "t", code: "KeyK", ctrlKey: true }), false)).toBe(false);
    expect(isPaletteShortcut(key({ key: "k", code: "KeyV", ctrlKey: true }), false)).toBe(true);
  });

  it("ignores keydown events without a key, as autofill sends", () => {
    expect(isPaletteShortcut(key({ key: undefined, metaKey: true }), true)).toBe(false);
  });
});

describe("isShortcutSheetKey", () => {
  it("is a plain question mark", () => {
    expect(isShortcutSheetKey(key({ key: "?", code: "Slash", shiftKey: true }))).toBe(true);
    expect(isShortcutSheetKey(key({ key: "/", code: "Slash" }))).toBe(false);
  });

  it("leaves chords with ?, like the macOS Help menu, alone", () => {
    expect(isShortcutSheetKey(key({ key: "?", shiftKey: true, metaKey: true }))).toBe(false);
    expect(isShortcutSheetKey(key({ key: "?", shiftKey: true, ctrlKey: true }))).toBe(false);
  });
});
