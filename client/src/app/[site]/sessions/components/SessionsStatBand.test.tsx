import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionsSummary } from "@/api/analytics/endpoints";
import { SessionsStatBand } from "./SessionsStatBand";

const mocks = vi.hoisted(() => ({ comparisonEnabled: true }));

// Enough of ICU for the messages under test: {name} and one/other plurals.
const format = (message: string, values: Record<string, string | number> = {}) =>
  message
    .replace(/\{(\w+), plural, one \{([^}]*)\} other \{([^}]*)\}\}/g, (_, key, one, other) =>
      (Number(values[key]) === 1 ? one : other).replace("#", String(values[key]))
    )
    .replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

vi.mock("next-intl", () => ({
  useExtracted: () => format,
}));

vi.mock("@/lib/store", () => ({
  useComparisonEnabled: () => mocks.comparisonEnabled,
}));

const matching = { all: 0, identified: 0, replay: 0, converted: 0, bounced: 0, errors: 0 };

const summary = (overrides: Partial<SessionsSummary> = {}): SessionsSummary => ({
  sessions: 2000,
  session_duration: 164,
  pages_per_session: 2.534,
  bounce_rate: 41.2,
  converted: 650,
  with_errors: 44,
  matching,
  days: [],
  ...overrides,
});

const previous = summary({
  sessions: 1600,
  session_duration: 151,
  pages_per_session: 2.5,
  bounce_rate: 43.1,
  converted: 480,
  with_errors: 30,
});

const labels = () => [...document.querySelectorAll(".uppercase")].map(label => label.textContent);

beforeEach(() => {
  mocks.comparisonEnabled = true;
});

afterEach(cleanup);

describe("SessionsStatBand", () => {
  it("shows the period's six figures", () => {
    render(<SessionsStatBand summary={summary()} previous={previous} isLoading={false} />);

    expect(labels()).toEqual([
      "Sessions",
      "Avg duration",
      "Pages per session",
      "Bounce rate",
      "Converted",
      "With errors",
    ]);
    expect(screen.getByText("2m 44s")).toBeTruthy();
    expect(screen.getByText("2.53")).toBeTruthy();
    expect(screen.getByText("41.2%")).toBeTruthy();
    // 650 and 44 of 2,000 sessions.
    expect(screen.getByText("32.5%")).toBeTruthy();
    expect(screen.getByText("2.2%")).toBeTruthy();
    expect(screen.getByText("650 sessions, any goal")).toBeTruthy();
    expect(screen.getByText("44 sessions")).toBeTruthy();
  });

  it("compares each figure with the previous period: percent for amounts, points for rates", () => {
    render(<SessionsStatBand summary={summary()} previous={previous} isLoading={false} />);

    expect(screen.getByText("25.0%")).toBeTruthy(); // sessions 2,000 against 1,600
    expect(screen.getByText("8.6%")).toBeTruthy(); // duration 164s against 151s
    expect(screen.getByText("1.9 pp")).toBeTruthy(); // bounce 41.2% against 43.1%
    expect(screen.getByText("2.5 pp")).toBeTruthy(); // converted 32.5% against 30.0%
    expect(screen.getByText("0.3 pp")).toBeTruthy(); // errors 2.2% against 1.9%
    expect(screen.getByText("2m 31s prev.")).toBeTruthy();
    expect(screen.getByText("43.1% prev.")).toBeTruthy();
  });

  it("colours a falling bounce rate as good and rising errors as bad", () => {
    render(<SessionsStatBand summary={summary()} previous={previous} isLoading={false} />);

    expect(screen.getByText("1.9 pp").parentElement?.className).toContain("emerald");
    expect(screen.getByText("0.3 pp").parentElement?.className).toContain("red");
  });

  it("draws no deltas or previous values with the comparison off", () => {
    mocks.comparisonEnabled = false;
    render(<SessionsStatBand summary={summary()} previous={undefined} isLoading={false} />);

    expect(screen.queryByText(/prev\./)).toBeNull();
    expect(screen.queryByText(/pp$/)).toBeNull();
    // The counts under the two rates are not comparisons and stay.
    expect(screen.getByText("44 sessions")).toBeTruthy();
  });

  it("leaves conversions out on a site with no goals", () => {
    render(<SessionsStatBand summary={summary({ converted: null })} previous={previous} isLoading={false} />);

    expect(labels()).toEqual(["Sessions", "Avg duration", "Pages per session", "Bounce rate", "With errors"]);
  });

  it("reports an empty period as zeros, not as NaN", () => {
    render(
      <SessionsStatBand
        summary={summary({
          sessions: 0,
          session_duration: 0,
          pages_per_session: 0,
          bounce_rate: 0,
          converted: 0,
          with_errors: 0,
        })}
        previous={undefined}
        isLoading={false}
      />
    );

    expect(document.body.textContent).not.toContain("NaN");
    expect(screen.getByText("0 sessions")).toBeTruthy();
    expect(screen.getByText("0 sessions, any goal")).toBeTruthy();
  });

  it("keeps its labels and hides its values while loading", () => {
    render(<SessionsStatBand summary={undefined} previous={undefined} isLoading />);

    expect(labels()).toContain("Sessions");
    expect(screen.queryByText("0s")).toBeNull();
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
