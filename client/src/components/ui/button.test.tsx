import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "./button";

afterEach(cleanup);

// The two grid layers inside a loading-capable button: [label, spinner].
function layers(button: HTMLElement) {
  const grid = button.firstElementChild as HTMLElement;
  return Array.from(grid.children) as HTMLElement[];
}

describe("Button", () => {
  it("renders exactly as before when loading is not passed", () => {
    render(
      <Button variant="success" size="sm" className="w-full">
        Save
      </Button>
    );

    const button = screen.getByRole("button", { name: "Save" });
    expect(button.innerHTML).toBe("Save");
    expect(button.className).toContain("w-full");
    expect(button.hasAttribute("aria-busy")).toBe(false);
    expect(button.hasAttribute("aria-disabled")).toBe(false);
  });

  it("keeps the label in layout under a hidden spinner while idle", () => {
    render(<Button loading={false}>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    const [label, spinner] = layers(button);
    expect(label.textContent).toBe("Save");
    expect(label.className).toContain("opacity-100");
    expect(spinner.getAttribute("aria-hidden")).toBe("true");
    expect(spinner.className).toContain("opacity-0");
    expect(spinner.querySelector("svg")!.style.animationPlayState).toBe("paused");
    expect(button.hasAttribute("aria-busy")).toBe(false);
    expect(button.hasAttribute("aria-disabled")).toBe(false);
  });

  it("crossfades to the spinner while loading without removing the label", () => {
    const { rerender } = render(<Button loading={false}>Save</Button>);
    rerender(<Button loading>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    const [label, spinner] = layers(button);
    // Same grid cell, so the invisible label still sets the width.
    expect(label.className).toContain("col-start-1 row-start-1");
    expect(spinner.className).toContain("col-start-1 row-start-1");
    expect(label.textContent).toBe("Save");
    expect(label.className).toContain("opacity-0");
    expect(spinner.className).toContain("opacity-100");
    expect(spinner.querySelector("svg")!.style.animationPlayState).toBe("");
  });

  it("stays focusable while loading: aria-busy and aria-disabled, never the disabled attribute", () => {
    const { rerender } = render(<Button loading={false}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    button.focus();

    rerender(<Button loading>Save</Button>);

    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(button);
  });

  it("lets loading win over disabled, then hands disabled back", () => {
    const { rerender } = render(
      <Button loading disabled>
        Save
      </Button>
    );
    const button = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-disabled")).toBe("true");

    rerender(
      <Button loading={false} disabled>
        Save
      </Button>
    );
    expect(button.disabled).toBe(true);
    expect(button.hasAttribute("aria-disabled")).toBe(false);
  });

  it("ignores clicks while loading and handles them again afterwards", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button loading onClick={onClick}>
        Save
      </Button>
    );
    const button = screen.getByRole("button", { name: "Save" });

    const notCancelled = fireEvent.click(button);
    expect(notCancelled).toBe(false);
    expect(onClick).not.toHaveBeenCalled();

    rerender(
      <Button loading={false} onClick={onClick}>
        Save
      </Button>
    );
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not submit its form while loading", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const { rerender } = render(
      <form onSubmit={onSubmit}>
        <Button type="submit" loading>
          Save
        </Button>
      </form>
    );
    const button = screen.getByRole("button", { name: "Save" });

    button.click();
    expect(onSubmit).not.toHaveBeenCalled();

    rerender(
      <form onSubmit={onSubmit}>
        <Button type="submit" loading={false}>
          Save
        </Button>
      </form>
    );
    button.click();
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("announces loadingLabel as the accessible name only while loading", () => {
    const { rerender } = render(
      <Button loading={false} loadingLabel="Saving...">
        Save
      </Button>
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();

    rerender(
      <Button loading loadingLabel="Saving...">
        Save
      </Button>
    );
    expect(screen.getByRole("button", { name: "Saving..." })).toBeTruthy();
  });

  it("wraps an asChild element's children and blocks its clicks", () => {
    const onClick = vi.fn();
    render(
      <Button asChild loading>
        <a href="/billing" onClick={onClick}>
          Billing
        </a>
      </Button>
    );

    const link = screen.getByText("Billing").closest("a")!;
    expect(link.getAttribute("aria-busy")).toBe("true");
    expect(link.className).toContain("inline-flex");
    expect(layers(link)[0].textContent).toBe("Billing");

    expect(fireEvent.click(link)).toBe(false);
    expect(onClick).not.toHaveBeenCalled();
  });
});
