import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Favicon } from "./Favicon";

vi.mock("@/lib/const", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/const")>()),
  BACKEND_URL: "https://app.rybbit.com/api",
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Favicon", () => {
  it("loads the site's icon through Rybbit rather than a search engine cache", () => {
    render(<Favicon domain="example.com" />);
    const url = new URL(screen.getByRole("img").getAttribute("src")!);
    expect(url.origin + url.pathname).toBe("https://app.rybbit.com/api/favicon");
    expect(url.searchParams.get("domain")).toBe("example.com");
  });

  it("retries a failed icon when switching sites", () => {
    const view = render(<Favicon domain="old.example.com" />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
    view.rerender(<Favicon domain="new.example.com" />);
    expect(screen.getByRole("img").getAttribute("alt")).toBe("Favicon for new.example.com");
    view.rerender(<Favicon domain="old.example.com" />);
    expect(screen.getByRole("img")).toBeTruthy();
  });

  it("refreshes icons and retries failures in an open dashboard after an hour", () => {
    vi.useFakeTimers();
    const view = render(<Favicon domain="example.com" />);
    const firstSrc = screen.getByRole("img").getAttribute("src");
    act(() => vi.advanceTimersByTime(60 * 60 * 1000));
    expect(screen.getByRole("img").getAttribute("src")).not.toBe(firstSrc);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
    act(() => vi.advanceTimersByTime(60 * 60 * 1000));
    expect(screen.getByRole("img")).toBeTruthy();
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
