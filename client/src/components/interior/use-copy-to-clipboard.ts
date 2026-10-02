// Adapted from interior.dev "Copy Button" (MIT). See ./THIRD_PARTY_LICENSES.md
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CopyStatus = "idle" | "copied" | "error";

export type UseCopyToClipboardOptions = {
  // How long "copied" or "error" shows before returning to idle, in ms. Restarts on every copy.
  timeout?: number;
  onCopy?: (value: string) => void;
  onError?: (reason: unknown) => void;
};

// Radix dialogs, sheets and menus trap focus: a textarea mounted outside them has
// focus pulled straight back before the copy runs. Mount it inside the overlay
// that holds focus instead.
function fallbackHost(): HTMLElement {
  const active = document.activeElement;
  const overlay =
    active instanceof HTMLElement
      ? active.closest<HTMLElement>('[role="dialog"], [role="alertdialog"], [role="menu"]')
      : null;
  return overlay ?? document.body;
}

// document.execCommand("copy") through an invisible textarea, for contexts without
// the async Clipboard API (self-hosts served over plain HTTP) or where it rejects
// (iframes without clipboard-write). Puts the user's selection and focus back.
export function writeFallback(text: string): boolean {
  const selection = document.getSelection();
  // A copy, since engines may collapse the live range in place when focus moves.
  const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.tabIndex = -1;
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.opacity = "0";
  area.style.pointerEvents = "none";
  fallbackHost().appendChild(area);

  let ok = false;
  try {
    area.focus({ preventScroll: true });
    area.select();
    area.setSelectionRange(0, text.length);
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  } finally {
    area.remove();
    // Focus first: focusing can move the selection, so it is restored last.
    if (previousFocus && previousFocus !== document.body && previousFocus.isConnected) {
      previousFocus.focus({ preventScroll: true });
    }
    if (selection && previousRange) {
      selection.removeAllRanges();
      selection.addRange(previousRange);
    }
  }
  return ok;
}

export function useCopyToClipboard({ timeout = 2000, onCopy, onError }: UseCopyToClipboardOptions = {}) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  // Bumped on every copy so the reset timer restarts even when the status doesn't change.
  const [ticket, setTicket] = useState(0);

  const mounted = useRef(true);
  const handlers = useRef({ onCopy, onError });
  useEffect(() => {
    handlers.current = { onCopy, onError };
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setTicket(0);
  }, []);

  const copy = useCallback(async (text: string) => {
    if (!text) return false;

    let ok = false;
    let reason: unknown = null;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      } else {
        ok = writeFallback(text);
      }
    } catch (error) {
      reason = error;
      try {
        ok = writeFallback(text);
      } catch {
        ok = false;
      }
    }

    if (!mounted.current) return ok;

    setStatus(ok ? "copied" : "error");
    setTicket(n => n + 1);

    if (ok) handlers.current.onCopy?.(text);
    else handlers.current.onError?.(reason);

    return ok;
  }, []);

  useEffect(() => {
    if (ticket === 0 || status === "idle") return;
    const id = setTimeout(() => setStatus("idle"), timeout);
    return () => clearTimeout(id);
  }, [ticket, status, timeout]);

  return { copy, reset, status, copied: status === "copied" };
}
