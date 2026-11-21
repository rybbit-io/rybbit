import * as TabsPrimitive from "@radix-ui/react-tabs";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as Basic from "@/components/ui/basic-tabs";
import * as Pill from "@/components/ui/tabs";

// The indicator lives in components/interior/tabs-indicator and is exercised
// through the two public tab families that use it.

const tab = (name: string) => screen.getByRole("tab", { name });
const indicators = () => Array.from(document.querySelectorAll<HTMLElement>("[data-tabs-indicator]"));
// Radix selects on mousedown (primary button, no ctrl), not on click.
const press = (name: string) => fireEvent.mouseDown(tab(name));

afterEach(() => {
  cleanup();
});

function BasicTabs(props: React.ComponentProps<typeof Basic.Tabs>) {
  return (
    <Basic.Tabs {...props}>
      <Basic.TabsList>
        <Basic.TabsTrigger value="pages">Pages</Basic.TabsTrigger>
        <Basic.TabsTrigger value="countries">Countries</Basic.TabsTrigger>
        <Basic.TabsTrigger value="devices">Devices</Basic.TabsTrigger>
      </Basic.TabsList>
      <Basic.TabsContent value="pages">Pages panel</Basic.TabsContent>
      <Basic.TabsContent value="countries">Countries panel</Basic.TabsContent>
      <Basic.TabsContent value="devices">Devices panel</Basic.TabsContent>
    </Basic.Tabs>
  );
}

describe("tabs indicator", () => {
  it("draws one underline in the active trigger and moves it with an uncontrolled selection", () => {
    const onValueChange = vi.fn();
    render(<BasicTabs defaultValue="pages" onValueChange={onValueChange} />);

    expect(indicators()).toHaveLength(1);
    expect(tab("Pages").contains(indicators()[0])).toBe(true);
    expect(indicators()[0].dataset.tabsIndicator).toBe("underline");

    press("Devices");

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("devices");
    expect(indicators()).toHaveLength(1);
    expect(tab("Devices").contains(indicators()[0])).toBe(true);
    expect(tab("Devices").getAttribute("aria-selected")).toBe("true");
    expect(tab("Pages").getAttribute("aria-selected")).toBe("false");
    expect(screen.getByRole("tabpanel").textContent).toBe("Devices panel");
  });

  it("follows a controlled value and stays put when the parent keeps it", () => {
    function Controlled() {
      const [value, setValue] = useState("pages");
      return <BasicTabs value={value} onValueChange={setValue} />;
    }
    const { unmount } = render(<Controlled />);

    press("Countries");
    expect(tab("Countries").contains(indicators()[0])).toBe(true);
    expect(screen.getByRole("tabpanel").textContent).toBe("Countries panel");
    unmount();

    // Weekdays.tsx pins value without onValueChange: the selection never moves.
    render(<BasicTabs defaultValue="pages" value="pages" />);
    press("Countries");
    expect(tab("Pages").contains(indicators()[0])).toBe(true);
    expect(tab("Pages").getAttribute("aria-selected")).toBe("true");
  });

  it("keeps Radix keyboard navigation (automatic activation)", async () => {
    render(<BasicTabs defaultValue="pages" />);

    tab("Pages").focus();
    fireEvent.keyDown(tab("Pages"), { key: "ArrowRight" });

    await waitFor(() => expect(tab("Countries").getAttribute("aria-selected")).toBe("true"));
    expect(document.activeElement).toBe(tab("Countries"));
    expect(tab("Countries").contains(indicators()[0])).toBe(true);
  });

  it("selects nothing and draws nothing without a value", () => {
    render(<BasicTabs />);

    expect(indicators()).toHaveLength(0);
    expect(screen.getAllByRole("tab").every(element => element.getAttribute("aria-selected") === "false")).toBe(true);
  });

  it("gives every Tabs instance its own indicator", () => {
    render(
      <>
        <BasicTabs defaultValue="pages" />
        <BasicTabs defaultValue="devices" />
      </>
    );

    const [first, second] = indicators();
    expect(indicators()).toHaveLength(2);
    expect(screen.getAllByRole("tab", { name: "Pages" })[0].contains(first)).toBe(true);
    expect(screen.getAllByRole("tab", { name: "Devices" })[1].contains(second)).toBe(true);
  });

  it("draws a flat pill thumb for ui/tabs", () => {
    render(
      <Pill.Tabs defaultValue="timeline">
        <Pill.TabsList>
          <Pill.TabsTrigger value="timeline">Timeline</Pill.TabsTrigger>
          <Pill.TabsTrigger value="info">Session Info</Pill.TabsTrigger>
        </Pill.TabsList>
      </Pill.Tabs>
    );

    expect(indicators()).toHaveLength(1);
    expect(indicators()[0].dataset.tabsIndicator).toBe("thumb");
    expect(tab("Timeline").contains(indicators()[0])).toBe(true);
    expect(tab("Timeline").className).not.toMatch(/shadow/);

    press("Session Info");
    expect(tab("Session Info").contains(indicators()[0])).toBe(true);
  });

  it("slides the underline under the ui/tabs root too (UserTopPages mixes the two)", () => {
    render(
      <Pill.Tabs defaultValue="pages">
        <Basic.TabsList>
          <Basic.TabsTrigger value="pages">Top Pages</Basic.TabsTrigger>
          <Basic.TabsTrigger value="events">Events</Basic.TabsTrigger>
        </Basic.TabsList>
      </Pill.Tabs>
    );

    expect(indicators()[0].dataset.tabsIndicator).toBe("underline");
    press("Events");
    expect(tab("Events").contains(indicators()[0])).toBe(true);
  });

  it("hydrates its server render without a mismatch", async () => {
    const element = (
      <>
        <BasicTabs defaultValue="countries" />
        <Pill.Tabs defaultValue="info">
          <Pill.TabsList>
            <Pill.TabsTrigger value="timeline">Timeline</Pill.TabsTrigger>
            <Pill.TabsTrigger value="info">Session Info</Pill.TabsTrigger>
          </Pill.TabsList>
        </Pill.Tabs>
      </>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(element);
    document.body.appendChild(container);

    // The server already draws each indicator in its active trigger.
    expect(container.querySelectorAll("[data-tabs-indicator]")).toHaveLength(2);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, element, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
    act(() => root?.unmount());
    container.remove();
  });

  it("falls back to the static active style under a plain Radix root", () => {
    render(
      <TabsPrimitive.Root defaultValue="pages">
        <Basic.TabsList>
          <Basic.TabsTrigger value="pages">Pages</Basic.TabsTrigger>
          <Basic.TabsTrigger value="countries">Countries</Basic.TabsTrigger>
        </Basic.TabsList>
      </TabsPrimitive.Root>
    );

    expect(indicators()).toHaveLength(0);
    expect(tab("Pages").className).toContain("data-[state=active]:border-neutral-950");
  });
});
