import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";

type RunVariables = { query: string; signal?: AbortSignal };
type RunResult = { data: Record<string, unknown>[] };

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  clock: 0,
}));

vi.mock("next-intl", () => ({
  useExtracted:
    () =>
    (message: string, values: Record<string, string> = {}) =>
      message.replace(/\{(\w+)\}/g, (_match, key: string) => values[key] ?? key),
  useLocale: () => "en",
}));
vi.mock("next/navigation", () => ({ useParams: () => ({ site: "7" }) }));
vi.mock("@/api/admin/hooks/useSites", () => ({
  useGetSite: () => ({ data: { organizationId: "org-1" }, isLoading: false }),
}));
vi.mock("@/api/analytics/hooks/useCustomQuery", () => ({
  useRunCustomQuery: () => ({ mutateAsync: mocks.run }),
  useGenerateCustomQuery: () => ({ mutateAsync: vi.fn() }),
}));

import QueryPage from "./page";

// A run the test settles by hand. Like axios, it rejects as soon as its signal aborts.
function deferredRun() {
  let resolve: (result: RunResult) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  let signal: AbortSignal | undefined;
  mocks.run.mockImplementationOnce((variables: RunVariables) => {
    signal = variables.signal;
    return new Promise<RunResult>((done, fail) => {
      resolve = done;
      reject = fail;
      signal?.addEventListener("abort", () => fail(Object.assign(new Error("canceled"), { name: "CanceledError" })));
    });
  });
  return {
    resolve: (result: RunResult) => act(async () => resolve(result)),
    reject: (error: unknown) => act(async () => reject(error)),
    get signal() {
      return signal;
    },
  };
}

let visibility: DocumentVisibilityState = "visible";

beforeEach(() => {
  mocks.clock = 1_000;
  mocks.run.mockReset();
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  vi.spyOn(performance, "now").mockImplementation(() => mocks.clock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (document as { visibilityState?: DocumentVisibilityState }).visibilityState;
});

function showPage() {
  render(
    <TooltipProvider>
      <QueryPage />
    </TooltipProvider>
  );
  const editor = screen.getByRole("textbox", { name: "SQL query" });
  fireEvent.change(editor, { target: { value: "SELECT pathname FROM scoped_events" } });
  const runShortcut = () => fireEvent.keyDown(editor, { key: "Enter", metaKey: true });
  return { editor, runShortcut };
}

const getStatusText = (text: string) =>
  screen.getByText((_content, element) => element?.tagName === "SPAN" && element.textContent === text);

describe("Query page runs", () => {
  it("runs on ⌘Enter, shows the loader, and Cancel restores the previous results", async () => {
    const { editor, runShortcut } = showPage();

    const first = deferredRun();
    runShortcut();
    expect(mocks.run).toHaveBeenCalledWith(expect.objectContaining({ query: "SELECT pathname FROM scoped_events" }));
    mocks.clock = 4_200;
    await first.resolve({ data: [{ pathname: "/" }, { pathname: "/pricing" }] });
    expect(getStatusText("2 rows · 3.2s")).toBeTruthy();

    const second = deferredRun();
    runShortcut();
    expect(screen.getAllByText("Running query").length).toBeGreaterThan(0);
    expect(screen.queryByRole("columnheader", { name: "pathname" })).toBeNull();
    expect(editor.hasAttribute("readonly")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await act(async () => {});

    expect(second.signal?.aborted).toBe(true);
    expect(screen.getAllByText("Query cancelled").length).toBeGreaterThan(0);
    expect(screen.getByRole("columnheader", { name: "pathname" })).toBeTruthy();
    expect(screen.queryByText("Error")).toBeNull();
    expect(document.activeElement).toBe(editor);
    expect(editor.hasAttribute("readonly")).toBe(false);
  });

  it("keeps the error block when a run fails", async () => {
    const { runShortcut } = showPage();

    const failing = deferredRun();
    runShortcut();
    await failing.reject(new Error("Unknown column pathnam"));

    expect(screen.getByText("Unknown column pathnam")).toBeTruthy();
  });

  it("flags a hidden browser tab when a run finishes and restores the title on return", async () => {
    const { runShortcut } = showPage();
    expect(document.title).toBe("Query");

    const done = deferredRun();
    runShortcut();
    visibility = "hidden";
    await done.resolve({ data: [{ pathname: "/" }] });
    expect(document.title).toBe("✓ Query done · Query");

    visibility = "visible";
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(document.title).toBe("Query");

    const failed = deferredRun();
    runShortcut();
    visibility = "hidden";
    await failed.reject(new Error("Timeout exceeded"));
    expect(document.title).toBe("Query failed · Query");
  });
});
