import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MouseEvent, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BotAiSummaryRow } from "@/api/analytics/endpoints";
import { useStore } from "@/lib/store";
import type { AiSignups } from "../../useAiSignups";
import { AiOperatorTable } from "./AiOperatorTable";

const mocks = vi.hoisted(() => ({
  current: undefined as unknown,
  previous: undefined as unknown,
  error: null as Error | null,
  isLoading: false,
  signups: null as unknown,
  signupArgs: [] as unknown[],
  pivots: [] as unknown[],
}));

// Enough of ICU for these sentences: {name}, {count, number} and plurals.
const format = (message: string, values: Record<string, unknown> = {}) =>
  message
    .replace(/\{(\w+), plural, one \{([^}]*)\} other \{([^}]*)\}\}/g, (_, key, one, other) =>
      (Number(values[key]) === 1 ? one : other).replace("#", Number(values[key]).toLocaleString("en-US"))
    )
    .replace(/\{(\w+), number\}/g, (_, key) => Number(values[key]).toLocaleString("en-US"))
    .replace(/\{(\w+)\}/g, (_, key) => String(values[key]))
    .replace(/<\/?b>/g, "");

vi.mock("next-intl", () => {
  const t = Object.assign((message: string, values?: Record<string, unknown>) => format(message, values), {
    rich: (message: string, values?: Record<string, unknown>) => format(message, values),
  });
  return { useExtracted: () => t };
});

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    prefetch,
    onClick,
    ...props
  }: {
    href: string;
    children: ReactNode;
    prefetch?: boolean;
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  }) => (
    <a
      href={href}
      {...props}
      onClick={event => {
        // jsdom cannot navigate; following the link is the router's job, not what is under test.
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/api/analytics/hooks/bots/useGetBotAiSummary", () => ({
  useGetBotAiSummary: ({ periodTime }: { periodTime?: string }) =>
    periodTime === "previous"
      ? { data: mocks.previous }
      : {
          data: mocks.current,
          isLoading: mocks.isLoading,
          isFetching: false,
          error: mocks.error,
          refetch: vi.fn(),
        },
}));

vi.mock("@/api/analytics/hooks/bots/useGetBotTimeSeries", () => ({
  useGetBotTimeSeries: () => ({
    data: [{ time: "2026-09-01 00:00:00" }, { time: "2026-09-02 00:00:00" }],
  }),
}));

vi.mock("@/hooks/usePivotHref", () => ({
  usePivotHref: () => (target: string, filters: unknown) => `/42/${target}?filters=${JSON.stringify(filters)}`,
}));

vi.mock("@/components/site/PivotActions", () => ({
  PivotActions: (props: { filters: unknown; actions: string[] }) => {
    mocks.pivots.push(props);
    return <div data-testid="pivots">{props.actions.join(",")}</div>;
  },
}));

vi.mock("../../useAiSignups", () => ({
  useAiSignups: (args: unknown) => {
    mocks.signupArgs.push(args);
    return mocks.signups as AiSignups | null;
  },
}));

const operator = (overrides: Partial<BotAiSummaryRow>): BotAiSummaryRow => ({
  operator: "OpenAI",
  crawls: 0,
  training_crawls: 0,
  search_crawls: 0,
  agent_requests: 0,
  pages: 0,
  referrals: 0,
  crawls_per_referral: 0,
  referrer_domains: [],
  bots: [],
  ...overrides,
});

const openai = operator({
  operator: "OpenAI",
  crawls: 19580,
  training_crawls: 9840,
  search_crawls: 5480,
  agent_requests: 4260,
  pages: 231,
  referrals: 1720,
  referrer_domains: ["chatgpt.com", "chat.openai.com"],
  bots: [
    { name: "GPTBot", purpose: "ai_training", reads: 9840, pages: 212, trend: [["2026-09-01 00:00:00", 9840]] },
    { name: "ChatGPT-User", purpose: "ai_agent", reads: 4260, pages: 143, trend: [["2026-09-02 00:00:00", 4260]] },
  ],
});
const bytedance = operator({
  operator: "ByteDance",
  crawls: 4310,
  training_crawls: 4310,
  pages: 242,
  bots: [{ name: "Bytespider", purpose: "ai_training", reads: 4310, pages: 242 }],
});
const microsoft = operator({ operator: "Microsoft", referrals: 96, referrer_domains: ["copilot.microsoft.com"] });

// Operator rows are the buttons that expand; the sort headers and "Show more" are not.
const rows = () => screen.getAllByRole("button").filter(button => button.hasAttribute("aria-expanded"));
const operatorNames = () => rows().map(element => element.querySelector("span.font-medium")?.textContent);
const row = (name: string) => rows().find(element => element.textContent?.includes(name))!;

beforeEach(() => {
  mocks.current = [openai, bytedance, microsoft];
  mocks.previous = [
    operator({ operator: "OpenAI", crawls: 14170, referrals: 1218 }),
    operator({ operator: "ByteDance", crawls: 4890 }),
  ];
  mocks.error = null;
  mocks.isLoading = false;
  mocks.signups = null;
  mocks.signupArgs = [];
  mocks.pivots = [];
  useStore.setState({ site: "42", timezone: "UTC", bucket: "day" });
});

afterEach(cleanup);

describe("AiOperatorTable", () => {
  it("lists operators by reads, with the change against the comparison period", () => {
    render(<AiOperatorTable />);

    expect(operatorNames()).toEqual(["OpenAI", "ByteDance", "Microsoft"]);
    expect(within(row("OpenAI")).getByText("19,580")).toBeTruthy();
    // (19,580 - 14,170) / 14,170
    expect(within(row("OpenAI")).getByText("38.2%")).toBeTruthy();
    expect(within(row("ByteDance")).getByText("11.9%")).toBeTruthy();
    expect(within(row("OpenAI")).getByText("GPTBot, ChatGPT-User")).toBeTruthy();
  });

  it("draws no change when there is no comparison period", () => {
    mocks.previous = undefined;
    render(<AiOperatorTable />);

    expect(within(row("OpenAI")).queryByText(/%/)).toBeNull();
  });

  it("shows an em dash, not a number, where there is no rate", () => {
    render(<AiOperatorTable />);

    expect(within(row("OpenAI")).getByText("11.4")).toBeTruthy();
    // ByteDance sent nobody back; Microsoft read nothing.
    expect(within(row("ByteDance")).getAllByText("—").length).toBeGreaterThan(0);
    expect(within(row("Microsoft")).queryByText(/: 1/)).toBeNull();
    expect(within(row("Microsoft")).getByText("No crawler seen")).toBeTruthy();
  });

  it("links visits back to the Sessions page, filtered to the operator's product", () => {
    render(<AiOperatorTable />);

    const link = within(row("OpenAI")).getByRole("link", { name: "1,720" });
    const filters = JSON.parse(decodeURIComponent(link.getAttribute("href")!.split("filters=")[1]));
    expect(filters).toEqual([
      { parameter: "channel", type: "equals", value: ["AI"] },
      { parameter: "referrer", type: "equals", value: ["chatgpt.com", "chat.openai.com"] },
    ]);
    // Nothing to open for an operator that sent no one.
    expect(within(row("ByteDance")).queryByRole("link")).toBeNull();
  });

  it("opens a row to its bots without following the link inside it", () => {
    render(<AiOperatorTable />);

    fireEvent.click(within(row("OpenAI")).getByRole("link", { name: "1,720" }));
    expect(row("OpenAI").getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(row("OpenAI"));
    expect(row("OpenAI").getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("GPTBot")).toBeTruthy();
    expect(screen.getByText("9,840")).toBeTruthy();
    expect(screen.getAllByText("Agent").length).toBeGreaterThan(1);
    expect(screen.getByText(/1,720 sessions arrived from chatgpt.com, chat.openai.com\./)).toBeTruthy();
    expect(screen.getByTestId("pivots").textContent).toBe("sessions,segment");

    fireEvent.keyDown(row("OpenAI"), { key: "Enter" });
    expect(row("OpenAI").getAttribute("aria-expanded")).toBe("false");
  });

  it("adds signups to the open row only when a signup goal resolved", () => {
    const { unmount } = render(<AiOperatorTable />);
    fireEvent.click(row("OpenAI"));
    expect(screen.queryByText(/signed up/)).toBeNull();
    // Asked for this operator's sessions only.
    expect(mocks.signupArgs.at(-1)).toEqual({ referrerDomains: ["chatgpt.com", "chat.openai.com"], enabled: true });
    unmount();

    mocks.signups = { goalName: "Signup", signups: 124, rate: 7.21, siteRate: 4.731 };
    render(<AiOperatorTable />);
    fireEvent.click(row("OpenAI"));
    expect(screen.getByText("124 signed up, 7.2% against 4.73% site-wide.")).toBeTruthy();
  });

  it("says so when an operator has no product that refers visitors", () => {
    render(<AiOperatorTable />);
    fireEvent.click(row("ByteDance"));

    expect(screen.getByText(/knows no product of this operator/)).toBeTruthy();
    expect(screen.queryByTestId("pivots")).toBeNull();
    expect(mocks.signupArgs.at(-1)).toEqual({ referrerDomains: [], enabled: false });
  });

  it("sorts by a clicked column and reverses on a second click", () => {
    render(<AiOperatorTable />);

    fireEvent.click(screen.getByRole("button", { name: "Visits back" }));
    expect(operatorNames()).toEqual(["OpenAI", "Microsoft", "ByteDance"]);

    fireEvent.click(screen.getByRole("button", { name: "Visits back" }));
    expect(operatorNames()).toEqual(["ByteDance", "Microsoft", "OpenAI"]);

    fireEvent.click(screen.getByRole("button", { name: "Operator" }));
    expect(operatorNames()).toEqual(["ByteDance", "Microsoft", "OpenAI"]);
  });

  it("searches operators and their bots", () => {
    render(<AiOperatorTable />);

    fireEvent.change(screen.getByLabelText("Search operators"), { target: { value: "bytespider" } });
    expect(operatorNames()).toEqual(["ByteDance"]);

    fireEvent.change(screen.getByLabelText("Search operators"), { target: { value: "zzz" } });
    expect(screen.getByText("No operator matches “zzz”.")).toBeTruthy();
  });

  it("holds operators past the eighth behind a toggle that says what they add up to", () => {
    mocks.current = Array.from({ length: 11 }, (_, index) =>
      operator({ operator: `Operator ${index + 1}`, crawls: 1000 - index * 10, referrals: index })
    );
    mocks.previous = undefined;
    render(<AiOperatorTable />);

    expect(operatorNames()).toHaveLength(8);
    // The three hidden: reads 920 + 910 + 900, visits 8 + 9 + 10.
    expect(screen.getByText("2,730 reads · 27 visits back")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Show 3 more operators" }));
    expect(operatorNames()).toHaveLength(11);

    fireEvent.click(screen.getByRole("button", { name: "Show fewer operators" }));
    expect(operatorNames()).toHaveLength(8);
  });

  it("says there is no AI traffic rather than showing an empty table", () => {
    mocks.current = [];
    render(<AiOperatorTable />);

    expect(screen.getByText("No AI system read this site in this period, and none sent a visit.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reads" })).toBeNull();
  });

  it("shows the error with a retry instead of an empty table", () => {
    mocks.current = undefined;
    mocks.error = new Error("Failed to fetch bot ai summary");
    render(<AiOperatorTable />);

    expect(screen.getByText("Failed to fetch bot ai summary")).toBeTruthy();
    expect(screen.queryByText(/No AI system read/)).toBeNull();
  });
});
