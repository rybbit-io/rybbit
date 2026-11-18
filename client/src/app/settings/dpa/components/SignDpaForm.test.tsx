import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signDpa: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string>) =>
    message.replace(/\{(\w+)\}/g, (_, key) => values?.[key] ?? ""),
}));
vi.mock("next/font/google", () => ({ Dancing_Script: () => ({ className: "signature-font" }) }));
vi.mock("@/api/admin/endpoints/dpa", () => ({ signDpa: mocks.signDpa }));
vi.mock("@/components/ui/sonner", () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));

import { SignDpaForm } from "./SignDpaForm";

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SignDpaForm
        organizationId="org-1"
        currentVersion="2026-06-25"
        hasSigned={false}
        defaults={{ signerName: "Jo Example", signerEmail: "jo@acme.example" }}
      />
    </QueryClientProvider>
  );

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  vi.clearAllMocks();
  // The Radix checkbox renders a hidden input inside the form and measures it.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});
afterEach(cleanup);

describe("SignDpaForm", () => {
  it("fills the agreement preview in as the details are typed", async () => {
    renderForm();
    type("Company legal name", "Acme GmbH");

    expect(await screen.findByText("For the Customer: Acme GmbH")).toBeTruthy();
    expect(
      screen.getByText(
        "I'm authorized to sign for Acme GmbH, and I agree to this Data Processing Agreement on its behalf."
      )
    ).toBeTruthy();
  });

  it("won't sign until the signer confirms they can bind the company", async () => {
    renderForm();
    type("Company legal name", "Acme GmbH");
    type("Registered address", "Musterstraße 12\n10115 Berlin");
    type("Signer's title", "CEO");

    fireEvent.click(screen.getByRole("button", { name: /Sign DPA/ }));

    expect(await screen.findByText("Confirm you can sign for the company")).toBeTruthy();
    expect(mocks.signDpa).not.toHaveBeenCalled();
  });

  it("signs the version it showed, with the trimmed details", async () => {
    mocks.signDpa.mockResolvedValue({ agreement: { id: "a-1" }, emailed: true });
    renderForm();
    type("Company legal name", "  Acme GmbH ");
    type("Registered address", "Musterstraße 12\n10115 Berlin");
    type("Signer's title", "CEO");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Sign DPA/ }));

    await waitFor(() => expect(mocks.signDpa).toHaveBeenCalled());
    expect(mocks.signDpa).toHaveBeenCalledWith("org-1", {
      companyName: "Acme GmbH",
      companyAddress: "Musterstraße 12\n10115 Berlin",
      signerName: "Jo Example",
      signerTitle: "CEO",
      signerEmail: "jo@acme.example",
      dpaVersion: "2026-06-25",
      agreed: true,
    });
    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith("DPA signed. We emailed the PDF to jo@acme.example.")
    );
  });
});
