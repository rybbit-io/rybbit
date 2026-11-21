import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";

import { CopyButton } from "./copy-button";

const mocks = vi.hoisted(() => ({
  writeText: vi.fn<(text: string) => Promise<void>>(),
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string) => message,
}));

function installClipboardApi() {
  Object.defineProperty(navigator, "clipboard", { value: { writeText: mocks.writeText }, configurable: true });
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, "clipboard");
  mocks.writeText.mockReset();
});

describe("CopyButton", () => {
  it("keeps every state's label in the button so its width never changes", () => {
    render(<CopyButton value="sk_live_123" label="Copy key" />);

    const button = screen.getByRole("button", { name: "Copy key" });
    expect(button.textContent).toContain("Copy key");
    expect(button.textContent).toContain("Copied");
    expect(button.textContent).toContain("Failed");
    expect(button.getAttribute("data-status")).toBe("idle");
    expect(button.getAttribute("type")).toBe("button");
  });

  it("uses the label as the accessible name of an icon-only button", () => {
    render(<CopyButton iconOnly value="npm i @rybbit/js" label="Copy code" />);

    const button = screen.getByRole("button", { name: "Copy code" });
    expect(button.textContent).toBe("");
  });

  it("announces a copy politely, from outside the button", async () => {
    installClipboardApi();
    mocks.writeText.mockResolvedValue(undefined);
    const onCopy = vi.fn();
    render(<CopyButton value="sk_live_123" label="Copy key" onCopy={onCopy} />);

    const button = screen.getByRole("button", { name: "Copy key" });
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("");
    // WebKit drops a button's descendants from the accessibility tree.
    expect(button.contains(status)).toBe(false);

    fireEvent.click(button);

    await waitFor(() => expect(status.textContent).toBe("Copied"));
    expect(button.getAttribute("data-status")).toBe("copied");
    expect(mocks.writeText).toHaveBeenCalledWith("sk_live_123");
    expect(onCopy).toHaveBeenCalledWith("sk_live_123");
  });

  it("announces a failure and hands the reason to onError", async () => {
    installClipboardApi();
    const denied = new DOMException("Write permission denied.", "NotAllowedError");
    mocks.writeText.mockRejectedValue(denied);
    const onError = vi.fn();
    // jsdom has no document.execCommand, so the fallback fails too.
    render(<CopyButton value="sk_live_123" label="Copy key" onError={onError} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy key" }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Couldn't copy to clipboard"));
    expect(screen.getByRole("button", { name: "Copy key" }).getAttribute("data-status")).toBe("error");
    expect(onError).toHaveBeenCalledWith(denied);
  });

  it("lets a caller's onClick cancel the copy", () => {
    installClipboardApi();
    render(<CopyButton value="sk_live_123" label="Copy key" onClick={event => event.preventDefault()} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy key" }));

    expect(mocks.writeText).not.toHaveBeenCalled();
  });
});

describe("CopyButton with a tooltip", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document, "execCommand");
  });

  function renderCopySql() {
    render(
      <TooltipProvider>
        <CopyButton iconOnly size="sm" tooltip value="SELECT 1" label="Copy SQL" timeout={150} />
      </TooltipProvider>
    );
    return screen.getByRole("button", { name: "Copy SQL" });
  }

  async function hover(button: HTMLElement) {
    fireEvent.pointerMove(button);
    const tooltip = await screen.findByRole("tooltip");
    // Let Radix finish mounting the content's dismiss listeners (set up on a timeout).
    await act(() => new Promise(resolve => setTimeout(resolve, 0)));
    return tooltip;
  }

  // A mouse click: Radix closes an open tooltip on pointerdown, on the content's
  // outside-press check, and again on click.
  function click(button: HTMLElement) {
    fireEvent.pointerDown(button, { button: 0 });
    fireEvent.pointerUp(button, { button: 0 });
    fireEvent.click(button);
  }

  const tooltipText = () => screen.getByRole("tooltip").textContent;

  it("stays open through the click and shows the outcome until the button is back at rest", async () => {
    installClipboardApi();
    mocks.writeText.mockResolvedValue(undefined);
    const button = renderCopySql();
    expect((await hover(button)).textContent).toBe("Copy SQL");

    click(button);

    expect(screen.queryByRole("tooltip")).not.toBeNull();
    await waitFor(() => expect(tooltipText()).toBe("Copied"));
    expect(mocks.writeText).toHaveBeenCalledWith("SELECT 1");
    // Back at rest while still hovered, it offers the action again.
    await waitFor(() => expect(tooltipText()).toBe("Copy SQL"));
  });

  it("still closes when the pointer leaves", async () => {
    installClipboardApi();
    mocks.writeText.mockResolvedValue(undefined);
    const button = renderCopySql();
    await hover(button);
    click(button);
    await waitFor(() => expect(tooltipText()).toBe("Copied"));

    fireEvent.pointerLeave(button);
    fireEvent.pointerMove(document.body, { clientX: 400, clientY: 400 });

    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("closes when a press is released away from the button, without copying", async () => {
    installClipboardApi();
    const button = renderCopySql();
    await hover(button);

    fireEvent.pointerDown(button, { button: 0 });
    expect(screen.queryByRole("tooltip")).not.toBeNull();
    fireEvent.pointerUp(document.body, { button: 0 });

    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
    expect(mocks.writeText).not.toHaveBeenCalled();
  });

  it("shows a failure in the tooltip", async () => {
    installClipboardApi();
    mocks.writeText.mockRejectedValue(new DOMException("Write permission denied.", "NotAllowedError"));
    const button = renderCopySql();
    await hover(button);

    // jsdom has no document.execCommand, so the fallback fails too.
    click(button);

    await waitFor(() => expect(tooltipText()).toBe("Couldn't copy to clipboard"));
  });

  it("stays open from the keyboard through the fallback's focus hop", async () => {
    Object.defineProperty(document, "execCommand", { value: () => true, configurable: true });
    const button = renderCopySql();
    act(() => button.focus());
    expect(tooltipText()).toBe("Copy SQL");

    // No Clipboard API: the fallback focuses a textarea, which blurs the button.
    fireEvent.click(button);

    expect(screen.queryByRole("tooltip")).not.toBeNull();
    await waitFor(() => expect(tooltipText()).toBe("Copied"));
    expect(document.activeElement).toBe(button);
  });

  it("still closes on Escape while showing the outcome", async () => {
    installClipboardApi();
    mocks.writeText.mockResolvedValue(undefined);
    const button = renderCopySql();
    await hover(button);
    click(button);
    await waitFor(() => expect(tooltipText()).toBe("Copied"));

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });
});
