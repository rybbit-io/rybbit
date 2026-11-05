import { useCallback, useEffect, useRef } from "react";

/**
 * Returns `notify(label)`: while the browser tab is hidden, it prefixes the document title with
 * `label` ("✓ Query done · Query") so a finished background run shows in the tab strip. The
 * original title comes back when the tab becomes visible again, or on unmount.
 */
export function useHiddenTabTitle() {
  const originalTitleRef = useRef<string | null>(null);

  useEffect(() => {
    const restore = () => {
      if (originalTitleRef.current === null) return;
      document.title = originalTitleRef.current;
      originalTitleRef.current = null;
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") restore();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      restore();
    };
  }, []);

  return useCallback((label: string) => {
    if (document.visibilityState !== "hidden") return;
    originalTitleRef.current ??= document.title;
    document.title = `${label} · ${originalTitleRef.current}`;
  }, []);
}
