import { act, cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Event } from "@/api/analytics/endpoints";

import { getEventKey } from "./eventLogUtils";
import { useEventLogState } from "./useEventLogState";

const mocks = vi.hoisted(() => ({
  cursorData: { pages: [{ data: [] }] },
  pollData: undefined as { data: Event[] } | undefined,
}));

vi.mock("@/api/analytics/hooks/events/useGetEvents", () => ({
  useGetEventsCursor: () => ({ data: mocks.cursorData }),
  useNewEventsPoll: () => ({ data: mocks.pollData }),
}));

function events(type: string, count: number): Event[] {
  return Array.from(
    { length: count },
    (_, index) =>
      ({
        timestamp: "2026-09-30 12:00:00",
        session_id: `${type}-${index}`,
        user_id: "user",
        type,
        event_name: "",
        pathname: "/",
      }) as Event
  );
}

beforeEach(() => {
  mocks.pollData = undefined;
});

afterEach(() => {
  cleanup();
});

describe.each(["jump", "scroll"])("useEventLogState arrivals after a %s resume", resume => {
  function pausedHook() {
    const hook = renderHook(({ visibleTypes }) => useEventLogState({ visibleTypes }), {
      initialProps: { visibleTypes: new Set(["pageview"]) },
    });
    const root = document.createElement("div");
    const viewport = document.createElement("div");
    viewport.setAttribute("data-slot", "scroll-area-viewport");
    root.appendChild(viewport);
    act(() => hook.result.current.scrollAreaCallbackRef(root));
    act(() => {
      viewport.scrollTop = 100;
      fireEvent.scroll(viewport);
    });
    expect(hook.result.current.isLive).toBe(false);
    return { ...hook, viewport };
  }

  function flush(result: ReturnType<typeof pausedHook>["result"], viewport: HTMLDivElement) {
    act(() => {
      if (resume === "jump") result.current.flushAndScrollToTop();
      else {
        viewport.scrollTop = 0;
        fireEvent.scroll(viewport);
      }
    });
  }

  it("applies the current filter before the 200-row highlight cap", () => {
    const { result, rerender, viewport } = pausedHook();
    const visible = events("custom_event", 205);
    mocks.pollData = { data: [...events("pageview", 250), ...visible] };
    rerender({ visibleTypes: new Set(["pageview"]) });
    expect(result.current.bufferedCount).toBe(455);

    rerender({ visibleTypes: new Set(["custom_event"]) });
    flush(result, viewport);

    expect(result.current.allEvents).toEqual(visible);
    expect([...result.current.arrivals.keys()]).toEqual(visible.slice(0, 200).map(getEventKey));
    expect(result.current.bufferedCount).toBe(0);
    expect(result.current.isLive).toBe(true);
  });

  it("highlights every event type when the current filter is empty", () => {
    const { result, rerender, viewport } = pausedHook();
    const incoming = [...events("custom_event", 2), ...events("pageview", 2)];
    mocks.pollData = { data: incoming };
    rerender({ visibleTypes: new Set() });
    flush(result, viewport);

    expect(result.current.allEvents).toEqual(incoming);
    expect([...result.current.arrivals.keys()]).toEqual(incoming.map(getEventKey));
  });
});
