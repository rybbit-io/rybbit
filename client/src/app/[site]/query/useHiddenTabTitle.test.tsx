import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useHiddenTabTitle } from "./useHiddenTabTitle";

let visibility: DocumentVisibilityState = "visible";

const setVisibility = (next: DocumentVisibilityState) => {
  visibility = next;
  document.dispatchEvent(new Event("visibilitychange"));
};

beforeEach(() => {
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  document.title = "Query";
});

afterEach(() => {
  // Drop the instance override so jsdom's own getter comes back.
  delete (document as { visibilityState?: DocumentVisibilityState }).visibilityState;
});

describe("useHiddenTabTitle", () => {
  it("leaves the title alone while the tab is visible", () => {
    const { result } = renderHook(() => useHiddenTabTitle());

    act(() => result.current("✓ Query done"));

    expect(document.title).toBe("Query");
  });

  it("flags a hidden tab and restores the title when it becomes visible", () => {
    const { result } = renderHook(() => useHiddenTabTitle());
    visibility = "hidden";

    act(() => result.current("✓ Query done"));
    expect(document.title).toBe("✓ Query done · Query");

    act(() => setVisibility("visible"));
    expect(document.title).toBe("Query");
  });

  it("keeps the original title across several background finishes", () => {
    const { result } = renderHook(() => useHiddenTabTitle());
    visibility = "hidden";

    act(() => result.current("✓ Query done"));
    act(() => result.current("Query failed"));
    expect(document.title).toBe("Query failed · Query");

    act(() => setVisibility("visible"));
    expect(document.title).toBe("Query");
  });

  it("restores the title on unmount", () => {
    const { result, unmount } = renderHook(() => useHiddenTabTitle());
    visibility = "hidden";

    act(() => result.current("Query failed"));
    unmount();

    expect(document.title).toBe("Query");
  });

  it("does not touch a title it never changed", () => {
    const { unmount } = renderHook(() => useHiddenTabTitle());
    document.title = "Sessions";

    act(() => setVisibility("visible"));
    unmount();

    expect(document.title).toBe("Sessions");
  });
});
