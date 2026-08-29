import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useReplayKeyboardShortcuts } from "./useReplayKeyboardShortcuts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useReplayKeyboardShortcuts", () => {
  it("gives stacked shortcuts to the most recently mounted replay player", () => {
    const pageToggle = vi.fn();
    const drawerToggle = vi.fn();
    const noOp = vi.fn();
    const page = renderHook(() =>
      useReplayKeyboardShortcuts({
        enabled: true,
        onSkipBack: noOp,
        onSkipForward: noOp,
        onPlayPause: pageToggle,
      })
    );
    const drawer = renderHook(() =>
      useReplayKeyboardShortcuts({
        enabled: true,
        onSkipBack: noOp,
        onSkipForward: noOp,
        onPlayPause: drawerToggle,
      })
    );

    document.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));

    expect(drawerToggle).toHaveBeenCalledOnce();
    expect(pageToggle).not.toHaveBeenCalled();

    drawer.unmount();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));

    expect(pageToggle).toHaveBeenCalledOnce();
    page.unmount();
  });
});
