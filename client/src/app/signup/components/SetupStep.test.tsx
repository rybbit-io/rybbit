import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));

import { SetupStep } from "./SetupStep";

afterEach(cleanup);

const renderStep = (domain: string, onSubmit = vi.fn()) => {
  render(<SetupStep domain={domain} setDomain={vi.fn()} isLoading={false} onSubmit={onSubmit} />);
  return onSubmit;
};

describe("SetupStep", () => {
  it("asks for the domain and nothing else", () => {
    renderStep("");

    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.getByLabelText("Website Domain")).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("submits as soon as the domain is valid", () => {
    const onSubmit = renderStep("acme.com");

    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("holds back a domain that isn't one", () => {
    const onSubmit = renderStep("not a domain");

    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.submit(button.closest("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
