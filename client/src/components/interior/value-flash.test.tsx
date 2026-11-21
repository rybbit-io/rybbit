import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type UseValueFlashOptions, useValueFlash } from "./use-value-flash";
import { ValueFlash } from "./value-flash";

type Props = { value: number } & UseValueFlashOptions<number>;

const QUESTION = { resetKey: "site 1 · today · no filters", ready: true, fetching: false };

function setup(initial: Partial<Props> = {}) {
  let props: Props = { value: 100, ...QUESTION, ...initial };
  const hook = renderHook((p: Props) => useValueFlash(p.value, p), { initialProps: props });
  return {
    result: hook.result,
    update(next: Partial<Props>) {
      props = { ...props, ...next };
      hook.rerender(props);
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useValueFlash", () => {
  it("never flashes on first render", () => {
    const { result } = setup();
    expect(result.current).toEqual({ direction: null, flashing: false, changeId: 0 });
  });

  it("flashes once, in the direction of travel, when the same question gets a new answer", () => {
    const { result, update } = setup();

    update({ value: 120 });
    expect(result.current).toEqual({ direction: "up", flashing: true, changeId: 1 });

    act(() => vi.advanceTimersByTime(900));
    // The mark ends but keeps its direction so it can fade out in place.
    expect(result.current).toEqual({ direction: "up", flashing: false, changeId: 1 });

    act(() => vi.advanceTimersByTime(5000));
    update({ value: 90 });
    expect(result.current).toMatchObject({ direction: "down", flashing: true, changeId: 2 });
  });

  it("stays quiet on re-renders that don't change the value", () => {
    const { result, update } = setup();
    update({ value: 100 });
    update({ fetching: true });
    update({ fetching: false });
    expect(result.current.changeId).toBe(0);
  });

  it("re-baselines silently when the question changes (site, range, filters, bucket)", () => {
    const { result, update } = setup();

    update({ resetKey: "site 1 · yesterday · no filters", value: 40 });
    expect(result.current.changeId).toBe(0);

    // The new question's own background refetch does flash.
    update({ value: 45 });
    expect(result.current).toMatchObject({ direction: "up", flashing: true, changeId: 1 });
  });

  it("doesn't flash while placeholder data stands in, nor when the real answer replaces it", () => {
    const { result, update } = setup();

    // Range changed: the previous range's number is still on screen as placeholder data.
    update({ resetKey: "site 1 · last 7 days · no filters", ready: false, fetching: true });
    update({ value: 700, ready: true, fetching: false });
    expect(result.current.changeId).toBe(0);

    update({ value: 710 });
    expect(result.current.changeId).toBe(1);
  });

  it("absorbs a stale cached answer being refreshed right after the question changes", () => {
    const { result, update } = setup();

    update({ resetKey: "site 1 · yesterday · no filters", value: 40, fetching: true });
    update({ value: 55, fetching: false });
    expect(result.current.changeId).toBe(0);

    update({ fetching: true });
    update({ value: 60, fetching: false });
    expect(result.current.changeId).toBe(1);
  });

  it("absorbs the refetch that runs on mount when the cache was stale", () => {
    const { result, update } = setup({ fetching: true });
    update({ value: 130, fetching: false });
    expect(result.current.changeId).toBe(0);
  });

  it("treats first data after an empty value as a baseline, even when a background refetch brings it", () => {
    // A new site reads 0 everywhere until its first pageview; the arrival refetches this same question.
    const { result, update } = setup({ value: 0, empty: true });
    update({ fetching: true });
    update({ value: 1, fetching: false, empty: false });
    expect(result.current.changeId).toBe(0);

    // From then on it is data like any other.
    update({ value: 3 });
    expect(result.current).toMatchObject({ direction: "up", flashing: true, changeId: 1 });
  });

  it("doesn't flash when the data vanishes back to empty", () => {
    const { result, update } = setup({ value: 5 });
    update({ value: 0, empty: true });
    expect(result.current.changeId).toBe(0);
  });

  it("ignores values that aren't real data yet", () => {
    const { result, update } = setup({ ready: false });
    update({ value: 0 });
    update({ value: 250 });
    expect(result.current.changeId).toBe(0);
  });

  it("stays quiet when compare says nothing visible changed", () => {
    const compact = new Intl.NumberFormat("en", { notation: "compact" });
    const compare = (next: number, previous: number) =>
      compact.format(next) === compact.format(previous) ? 0 : next - previous;
    const { result, update } = setup({ value: 12_345, compare });

    update({ value: 12_351 });
    expect(result.current.changeId).toBe(0);

    update({ value: 13_020 });
    expect(result.current).toMatchObject({ direction: "up", changeId: 1 });
  });

  it("flashes at most once per cooldown on a fast feed", () => {
    const { result, update } = setup({ cooldown: 2000 });

    update({ value: 101 });
    act(() => vi.advanceTimersByTime(500));
    update({ value: 102 });
    act(() => vi.advanceTimersByTime(500));
    update({ value: 103 });
    expect(result.current.changeId).toBe(1);

    act(() => vi.advanceTimersByTime(1500));
    update({ value: 99 });
    expect(result.current).toMatchObject({ direction: "down", changeId: 2 });
  });

  it("drops a throttled mark early rather than let it point the wrong way", () => {
    const { result, update } = setup({ cooldown: 2000 });

    update({ value: 120 });
    act(() => vi.advanceTimersByTime(300));
    update({ value: 125 });
    expect(result.current).toMatchObject({ direction: "up", flashing: true, changeId: 1 });

    update({ value: 110 });
    expect(result.current).toMatchObject({ flashing: false, changeId: 1 });
  });
});

describe("ValueFlash", () => {
  const glyphOf = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-slot='value-flash-glyph']");

  function renderFlash(value: number, extra: { invert?: boolean; format?: (value: number) => string } = {}) {
    return render(
      <ValueFlash value={value} {...QUESTION} {...extra}>
        <span>{value}</span>
      </ValueFlash>
    );
  }

  it("renders the value with no mark at rest", () => {
    const { container } = renderFlash(100);
    expect(container.textContent).toBe("100");
    expect(glyphOf(container)).toBeNull();
  });

  it("tints the text emerald and shows a decorative ▲ on a rise, then fades both", () => {
    const { container, rerender } = renderFlash(100);
    rerender(
      <ValueFlash value={120} {...QUESTION}>
        <span>120</span>
      </ValueFlash>
    );

    const mark = container.firstElementChild as HTMLElement;
    const glyph = glyphOf(container)!;
    expect(mark.className).toContain("text-accent-600");
    expect(mark.className).not.toContain("scale");
    expect(glyph.getAttribute("aria-hidden")).toBe("true");
    expect(glyph.style.clipPath).toBe("polygon(50% 0, 100% 100%, 0 100%)");
    expect(glyph.className).toContain("opacity-100");

    act(() => vi.advanceTimersByTime(900));
    expect(mark.className).not.toContain("text-accent-600");
    expect(glyph.className).toContain("opacity-0");
  });

  it("tints a rise red when up is bad news (bounce rate)", () => {
    const { container, rerender } = renderFlash(40, { invert: true });
    rerender(
      <ValueFlash value={45} invert {...QUESTION}>
        <span>45</span>
      </ValueFlash>
    );
    expect((container.firstElementChild as HTMLElement).className).toContain("text-red-600");
    // Still points the way the number moved.
    expect(glyphOf(container)!.style.clipPath).toBe("polygon(50% 0, 100% 100%, 0 100%)");
  });

  it("greets a first visit's 100% bounce rate without bad-news red", () => {
    const { container, rerender } = render(
      <ValueFlash value={0} invert empty {...QUESTION}>
        <span>0</span>
      </ValueFlash>
    );
    rerender(
      <ValueFlash value={100} invert empty={false} {...QUESTION}>
        <span>100</span>
      </ValueFlash>
    );
    expect((container.firstElementChild as HTMLElement).className).not.toContain("text-red-600");
    expect(glyphOf(container)).toBeNull();
  });

  it("doesn't flash when the rendered text is unchanged", () => {
    const format = (value: number) => `${Math.floor(value / 60)}m`;
    const { container, rerender } = renderFlash(125, { format });
    rerender(
      <ValueFlash value={130} format={format} {...QUESTION}>
        <span>2m</span>
      </ValueFlash>
    );
    expect(glyphOf(container)).toBeNull();
  });
});
