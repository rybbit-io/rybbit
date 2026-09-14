import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useSiteIcons } from "../lib/siteIcons";
import { Favicon } from "./Favicon";

afterEach(cleanup);

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
});
