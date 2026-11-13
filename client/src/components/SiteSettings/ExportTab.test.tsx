import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchEventExportCount: vi.fn() }));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string>) =>
    message.replace(/\{(\w+)\}/g, (_, key) => values?.[key] ?? ""),
}));
vi.mock("@/api/analytics/endpoints", async importOriginal => ({
  ...(await importOriginal<typeof import("@/api/analytics/endpoints")>()),
  fetchEventExportCount: mocks.fetchEventExportCount,
}));
vi.mock("@/components/CodeSnippet", () => ({ CodeSnippet: ({ code }: { code: string }) => <pre>{code}</pre> }));
vi.mock("@/lib/store", () => ({ useTimezone: () => "UTC" }));
// Radix Select needs pointer APIs jsdom lacks; a native select drives the same props.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select value={value} onChange={event => onValueChange(event.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

import { ExportTab } from "./ExportTab";

const renderExport = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ExportTab siteId={42} />
    </QueryClientProvider>
  );

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("Export tab", () => {
  it("links the download to the streaming export for the selected range", async () => {
    mocks.fetchEventExportCount.mockResolvedValue({ rows: 1234, maxRows: 2_000_000 });
    renderExport();

    const link = await screen.findByRole("link", { name: "Download" });
    const url = new URL(link.getAttribute("href")!, "http://localhost");
    expect(url.pathname).toMatch(/\/sites\/42\/export\/events$/);
    expect(url.searchParams.get("format")).toBe("csv");
    expect(url.searchParams.get("time_zone")).toBe("UTC");
    expect(url.searchParams.get("start_date")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(screen.getByText(`${(1234).toLocaleString()} events`)).toBeTruthy();

    const [, params] = mocks.fetchEventExportCount.mock.calls[0];
    expect(params.startDate).toBe(url.searchParams.get("start_date"));
    expect(params.endDate).toBe(url.searchParams.get("end_date"));
  });

  it("blocks a range over the per-file cap", async () => {
    mocks.fetchEventExportCount.mockResolvedValue({ rows: 3_000_000, maxRows: 2_000_000 });
    renderExport();

    await waitFor(() => expect(screen.getByText(/more than one file can hold/)).toBeTruthy());
    expect(screen.queryByRole("link", { name: "Download" })).toBeNull();
    expect((screen.getByRole("button", { name: "Download" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("disables the download when the range is empty", async () => {
    mocks.fetchEventExportCount.mockResolvedValue({ rows: 0, maxRows: 2_000_000 });
    renderExport();

    await waitFor(() => expect(screen.getByText("No events in this range.")).toBeTruthy());
    expect((screen.getByRole("button", { name: "Download" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("exports a custom range and refuses an inverted one", async () => {
    mocks.fetchEventExportCount.mockResolvedValue({ rows: 10, maxRows: 2_000_000 });
    renderExport();
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "custom" } });

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-03-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-03-02" } });
    const link = await screen.findByRole("link", { name: "Download" });
    const url = new URL(link.getAttribute("href")!, "http://localhost");
    expect(url.searchParams.get("start_date")).toBe("2026-03-01");
    expect(url.searchParams.get("end_date")).toBe("2026-03-02");

    const calls = mocks.fetchEventExportCount.mock.calls.length;
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-03-05" } });
    expect(screen.getByText("Pick a start date on or before the end date.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Download" })).toBeNull();
    expect(mocks.fetchEventExportCount.mock.calls.length).toBe(calls);
  });

  it("offers a one-day range for busy sites", async () => {
    mocks.fetchEventExportCount.mockResolvedValue({ rows: 10, maxRows: 2_000_000 });
    renderExport();
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "yesterday" } });

    const link = await screen.findByRole("link", { name: "Download" });
    const url = new URL(link.getAttribute("href")!, "http://localhost");
    expect(url.searchParams.get("start_date")).toBe(url.searchParams.get("end_date"));
  });
});
