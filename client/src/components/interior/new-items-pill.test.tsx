import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANNOUNCE_DELAY_MS, ANNOUNCE_INTERVAL_MS, NewItemsPill } from "./new-items-pill";

vi.mock("next-intl", () => ({ useLocale: () => "en" }));
vi.mock("@number-flow/react", () => ({
  default: ({ value }: { value: number }) => <span data-testid="ticker">{value}</span>,
}));

const describe_ = (count: number) => `${count} new ${count === 1 ? "event" : "events"}`;

function Pill({ count, onJump = () => {} }: { count: number; onJump?: () => void }) {
  return (
    <NewItemsPill
      count={count}
      onJump={onJump}
      describe={describe_}
      label={(n, ticker) => (
        <>
          {ticker} new {n === 1 ? "event" : "events"}
        </>
      )}
    />
  );
}

const status = () => screen.getByRole("status");

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("NewItemsPill", () => {
  it("renders no button while nothing is waiting", () => {
    render(<Pill count={0} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(status().textContent).toBe("");
  });

  it("appears as a real, labelled button whose count is the ticker", () => {
    const { rerender } = render(<Pill count={0} />);
    rerender(<Pill count={3} />);

    const button = screen.getByRole("button", { name: "3 new events" });
    expect(button.getAttribute("type")).toBe("button");
    expect(screen.getByTestId("ticker").textContent).toBe("3");
    // No resting shadow: it is an in-page control, not an overlay.
    expect(button.className).not.toMatch(/shadow/);

    rerender(<Pill count={7} />);
    expect(screen.getByRole("button", { name: "7 new events" })).toBeTruthy();
    expect(screen.getByTestId("ticker").textContent).toBe("7");
  });

  it("jumps on click", () => {
    const onJump = vi.fn();
    render(<Pill count={2} onJump={onJump} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onJump).toHaveBeenCalledOnce();
  });

  it("announces politely once the count settles, then at most once per interval with the latest count", () => {
    let now = 0;
    const advance = (ms: number) => {
      now += ms;
      act(() => vi.advanceTimersByTime(ms));
    };
    const { rerender } = render(<Pill count={2} />);

    advance(ANNOUNCE_DELAY_MS - 1);
    expect(status().textContent).toBe("");
    advance(1);
    expect(status().textContent).toBe("2 new events");
    const spokenAt = now;

    // Polls land every two seconds; none of them is spoken straight away...
    advance(2000);
    rerender(<Pill count={5} />);
    advance(2000);
    rerender(<Pill count={9} />);
    advance(ANNOUNCE_DELAY_MS);
    expect(status().textContent).toBe("2 new events");

    // ...the latest count is, once the interval since the last announcement has passed.
    advance(spokenAt + ANNOUNCE_INTERVAL_MS - now - 1);
    expect(status().textContent).toBe("2 new events");
    advance(1);
    expect(status().textContent).toBe("9 new events");
  });

  it("clears the announcement as soon as the count drops to zero, and starts fresh after", () => {
    const { rerender } = render(<Pill count={4} />);
    act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS));
    expect(status().textContent).toBe("4 new events");

    rerender(<Pill count={0} />);
    expect(status().textContent).toBe("");

    rerender(<Pill count={1} />);
    act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS));
    expect(status().textContent).toBe("1 new event");
  });
});
