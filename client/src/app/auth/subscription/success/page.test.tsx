import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, push: mocks.push }) }));

import StripeSuccessPage from "./page";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("legacy Stripe success page", () => {
  it("confirms the payment, then replaces itself with billing settings", () => {
    window.history.replaceState(null, "", "/auth/subscription/success");
    render(<StripeSuccessPage />);
    expect(screen.getByText("Payment Successful!")).toBeTruthy();
    expect(mocks.replace).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1000));
    expect(mocks.replace).toHaveBeenCalledWith("/settings/billing");
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("forwards the checkout session id so billing can record the conversion", () => {
    window.history.replaceState(null, "", "/auth/subscription/success?session_id=cs_test_123");
    render(<StripeSuccessPage />);

    act(() => vi.advanceTimersByTime(1000));
    expect(mocks.replace).toHaveBeenCalledWith("/settings/billing?session_id=cs_test_123");
  });
});
