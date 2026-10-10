import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSiteIcons } from "../lib/siteIcons";
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

describe("mobile site icons", () => {
  it("retries an absent icon after upload without remounting", () => {
    render(<Favicon domain="com.example.app" siteType="mobile" siteId={42} />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();

    act(() => useSiteIcons.getState().invalidate(42));

    expect(screen.getByRole("img").getAttribute("src")).toContain("/sites/42/icon?v=1");
  });

  it("loads the newly selected site's icon after the previous site failed", () => {
    const { rerender } = render(<Favicon domain="com.example.first" siteType="mobile" siteId={43} />);
    fireEvent.error(screen.getByRole("img"));

    rerender(<Favicon domain="com.example.second" siteType="mobile" siteId={44} />);

    expect(screen.getByRole("img").getAttribute("src")).toContain("/sites/44/icon");
  });

  it("refreshes all mounted copies after an icon replacement", () => {
    render(
      <>
        <Favicon domain="com.example.app" siteType="mobile" siteId={45} />
        <Favicon domain="com.example.app" siteType="mobile" siteId={45} />
      </>
    );

    act(() => useSiteIcons.getState().invalidate(45));

    for (const icon of screen.getAllByRole("img")) {
      expect(icon.getAttribute("src")).toContain("/sites/45/icon?v=1");
    }
  });

  it("falls back to the app glyph instead of fetching a favicon for a package name", () => {
    render(<Favicon domain="com.example.app" siteType="mobile" siteId={46} />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
  });
});
