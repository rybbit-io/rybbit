import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToggleChip } from "./ToggleChip";

// Proof of life for the jsdom project in vitest.config.ts: a purely
// presentational component, rendered and driven through the real DOM.

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ToggleChip", () => {
  it("renders its label inside a non-submitting button", () => {
    render(<ToggleChip isSelected={false} onClick={() => {}} label="Chrome" />);

    const button = screen.getByRole("button", { name: "Chrome" });
    expect(button).toBeTruthy();
    expect(button.getAttribute("type")).toBe("button");
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<ToggleChip isSelected={false} onClick={onClick} label="Chrome" />);

    screen.getByRole("button").click();

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders no indicator unless one is asked for", () => {
    const { container } = render(<ToggleChip isSelected={false} onClick={() => {}} label="Chrome" />);

    expect(container.querySelectorAll("div")).toHaveLength(0);
  });

  it("renders a colour swatch when given one, and dims it while unselected", () => {
    const { container, rerender } = render(
      <ToggleChip isSelected={false} onClick={() => {}} label="Chrome" swatchColor="rgb(255, 0, 0)" />
    );

    const swatch = container.querySelector("[style]") as HTMLElement;
    expect(swatch.style.backgroundColor).toBe("rgb(255, 0, 0)");
    expect(swatch.parentElement!.className).toContain("opacity-30");

    rerender(<ToggleChip isSelected onClick={() => {}} label="Chrome" swatchColor="rgb(255, 0, 0)" />);
    expect((container.querySelector("[style]") as HTMLElement).parentElement!.className).toContain("opacity-100");
  });

  it("lets an explicit indicator win over the swatch colour", () => {
    render(
      <ToggleChip
        isSelected
        onClick={() => {}}
        label="Chrome"
        swatchColor="red"
        indicator={<span data-testid="icon" />}
      />
    );

    expect(screen.getByTestId("icon")).toBeTruthy();
    expect(document.querySelector("[style]")).toBeNull();
  });

  it("appends a right adornment and merges extra class names", () => {
    render(
      <ToggleChip
        isSelected={false}
        onClick={() => {}}
        label="Chrome"
        rightAdornment={<span>42</span>}
        className="custom-chip"
      />
    );

    const button = screen.getByRole("button");
    expect(button.textContent).toBe("Chrome42");
    expect(button.className).toContain("custom-chip");
  });
});
