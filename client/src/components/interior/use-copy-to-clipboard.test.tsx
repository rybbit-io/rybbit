import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCopyToClipboard, writeFallback } from "./use-copy-to-clipboard";

const mocks = vi.hoisted(() => ({
  writeText: vi.fn<(text: string) => Promise<void>>(),
  execCommand: vi.fn<(command: string) => boolean>(),
}));

// jsdom implements neither the async Clipboard API nor document.execCommand.
function installClipboardApi() {
  Object.defineProperty(navigator, "clipboard", { value: { writeText: mocks.writeText }, configurable: true });
}

beforeEach(() => {
  Object.defineProperty(document, "execCommand", { value: mocks.execCommand, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "clipboard");
  Reflect.deleteProperty(document, "execCommand");
  mocks.writeText.mockReset();
  mocks.execCommand.mockReset();
  document.body.innerHTML = "";
});

describe("useCopyToClipboard", () => {
  it("copies with the Clipboard API, reports success, then returns to idle", async () => {
    vi.useFakeTimers();
    installClipboardApi();
    mocks.writeText.mockResolvedValue(undefined);
    const onCopy = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useCopyToClipboard({ onCopy, onError }));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.copy("sk_live_123");
    });

    expect(ok).toBe(true);
    expect(mocks.writeText).toHaveBeenCalledWith("sk_live_123");
    expect(mocks.execCommand).not.toHaveBeenCalled();
    expect(result.current.status).toBe("copied");
    expect(result.current.copied).toBe(true);
    expect(onCopy).toHaveBeenCalledWith("sk_live_123");
    expect(onError).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(result.current.status).toBe("copied");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.status).toBe("idle");
  });

  it("falls back to execCommand without the Clipboard API, restoring focus and selection", async () => {
    document.body.innerHTML = '<p id="note">keep me selected</p><button id="trigger" type="button">Copy</button>';
    const trigger = document.getElementById("trigger") as HTMLButtonElement;
    // Focus first: jsdom, like some engines, collapses the selection when focus moves.
    trigger.focus();
    const range = document.createRange();
    range.selectNodeContents(document.getElementById("note")!);
    document.getSelection()!.removeAllRanges();
    document.getSelection()!.addRange(range);

    let copiedFrom: Element | null = null;
    mocks.execCommand.mockImplementation(() => {
      copiedFrom = document.activeElement;
      return true;
    });
    const { result } = renderHook(() => useCopyToClipboard());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.copy("line one\nline two");
    });

    expect(ok).toBe(true);
    expect(mocks.execCommand).toHaveBeenCalledWith("copy");
    // The copy ran from a focused, fully selected textarea holding the exact text...
    expect(copiedFrom).toBeInstanceOf(HTMLTextAreaElement);
    const area = copiedFrom as unknown as HTMLTextAreaElement;
    expect(area.value).toBe("line one\nline two");
    expect([area.selectionStart, area.selectionEnd]).toEqual([0, "line one\nline two".length]);
    // ...which is gone again, with the user's focus and selection put back.
    expect(document.querySelector("textarea")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.getSelection()!.toString()).toBe("keep me selected");
    expect(result.current.status).toBe("copied");
  });

  it("falls back to execCommand when the Clipboard API rejects", async () => {
    installClipboardApi();
    mocks.writeText.mockRejectedValue(new DOMException("Document is not focused.", "NotAllowedError"));
    mocks.execCommand.mockReturnValue(true);
    const onCopy = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useCopyToClipboard({ onCopy, onError }));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.copy("https://app.rybbit.io/1/abc");
    });

    expect(ok).toBe(true);
    expect(mocks.execCommand).toHaveBeenCalledWith("copy");
    expect(result.current.status).toBe("copied");
    expect(onCopy).toHaveBeenCalledWith("https://app.rybbit.io/1/abc");
    expect(onError).not.toHaveBeenCalled();
  });

  it("mounts the fallback textarea inside the dialog that holds focus", () => {
    // Radix focus traps pull focus back out of anything mounted outside them.
    document.body.innerHTML = '<div role="dialog" id="dialog"><button id="inside" type="button">Copy</button></div>';
    const inside = document.getElementById("inside") as HTMLButtonElement;
    inside.focus();

    let host: Element | null = null;
    mocks.execCommand.mockImplementation(() => {
      host = document.querySelector("textarea")?.parentElement ?? null;
      return true;
    });

    expect(writeFallback("secret")).toBe(true);
    expect(host).toBe(document.getElementById("dialog"));
    expect(document.activeElement).toBe(inside);
  });

  it("reports failure when both the Clipboard API and the fallback fail", async () => {
    vi.useFakeTimers();
    installClipboardApi();
    const denied = new DOMException("Write permission denied.", "NotAllowedError");
    mocks.writeText.mockRejectedValue(denied);
    mocks.execCommand.mockReturnValue(false);
    const onCopy = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useCopyToClipboard({ onCopy, onError }));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.copy("sk_live_123");
    });

    expect(ok).toBe(false);
    expect(result.current.status).toBe("error");
    expect(result.current.copied).toBe(false);
    expect(onError).toHaveBeenCalledWith(denied);
    expect(onCopy).not.toHaveBeenCalled();
    expect(document.querySelector("textarea")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.status).toBe("idle");
  });

  it("reports failure when execCommand itself is unavailable", async () => {
    Reflect.deleteProperty(document, "execCommand");
    const onError = vi.fn();
    const { result } = renderHook(() => useCopyToClipboard({ onError }));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.copy("sk_live_123");
    });

    expect(ok).toBe(false);
    expect(result.current.status).toBe("error");
    expect(onError).toHaveBeenCalledOnce();
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("restarts the reset timer on every copy", async () => {
    vi.useFakeTimers();
    installClipboardApi();
    mocks.writeText.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCopyToClipboard({ timeout: 2000 }));

    await act(async () => {
      await result.current.copy("first");
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.status).toBe("copied");

    await act(async () => {
      await result.current.copy("second");
    });
    // 3000 ms after the first copy, but only 1500 after the second.
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.status).toBe("copied");

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.status).toBe("idle");
  });

  it("restarts the timer when a failure follows a success", async () => {
    vi.useFakeTimers();
    installClipboardApi();
    mocks.writeText.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("denied"));
    mocks.execCommand.mockReturnValue(false);
    const { result } = renderHook(() => useCopyToClipboard({ timeout: 1000 }));

    await act(async () => {
      await result.current.copy("first");
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    await act(async () => {
      await result.current.copy("second");
    });
    expect(result.current.status).toBe("error");

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(result.current.status).toBe("error");
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.status).toBe("idle");
  });

  it("does nothing for empty text", async () => {
    installClipboardApi();
    const { result } = renderHook(() => useCopyToClipboard());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.copy("");
    });

    expect(ok).toBe(false);
    expect(result.current.status).toBe("idle");
    expect(mocks.writeText).not.toHaveBeenCalled();
  });

  it("returns to idle immediately on reset", async () => {
    installClipboardApi();
    mocks.writeText.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("value");
    });
    expect(result.current.status).toBe("copied");

    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe("idle");
  });

  it("skips state updates and callbacks once unmounted", async () => {
    installClipboardApi();
    let finishWrite!: () => void;
    mocks.writeText.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          finishWrite = resolve;
        })
    );
    const onCopy = vi.fn();
    const { result, unmount } = renderHook(() => useCopyToClipboard({ onCopy }));

    const pending = result.current.copy("value");
    unmount();
    finishWrite();

    await expect(pending).resolves.toBe(true);
    expect(onCopy).not.toHaveBeenCalled();
  });
});
