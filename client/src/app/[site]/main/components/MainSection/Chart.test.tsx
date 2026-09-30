import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Time } from "@/components/DateSelector/types";
import { Chart } from "./Chart";

const mocks = vi.hoisted(() => ({
  previousTime: null as Time | null,
  chart: vi.fn((_props: { previous: unknown[] }) => null),
}));
vi.mock("next-intl", () => ({ useExtracted: () => (text: string) => text }));
vi.mock("@/lib/store", () => ({
  useStore: () => ({
    time: { mode: "day", day: "2026-09-01" },
    previousTime: mocks.previousTime,
    bucket: "hour",
    selectedStat: "users",
    site: "7",
  }),
  getTimezone: () => "UTC",
}));
vi.mock("@/components/charts/TimeSeriesChart", () => ({ TimeSeriesChart: mocks.chart }));
vi.mock("@/api/analytics/hooks/useAnnotations", () => ({ useDeleteAnnotation: () => ({ mutateAsync: vi.fn() }) }));
vi.mock("./annotations/useAnnotationPermissions", () => ({ useAnnotationPermissions: () => ({ canManage: false }) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Chart comparison data", () => {
  it("clears retained comparison points when comparison is disabled", () => {
    const data = [
      {
        time: "2026-09-01 10:00:00",
        users: 1,
        sessions: 1,
        pageviews: 1,
        pages_per_session: 1,
        bounce_rate: 0,
        session_duration: 1,
      },
    ];
    mocks.previousTime = { mode: "day", day: "2026-08-31" };
    const previousData = [{ ...data[0], time: "2026-08-31 10:00:00" }];
    const { rerender } = render(<Chart data={data} previousData={previousData} max={2} chartXMax={undefined} />);
    expect(mocks.chart.mock.calls.at(-1)![0].previous).toHaveLength(1);
    mocks.previousTime = null;
    rerender(<Chart data={data} previousData={previousData} max={2} chartXMax={undefined} />);
    expect(mocks.chart.mock.calls.at(-1)![0].previous).toEqual([]);
  });
});
