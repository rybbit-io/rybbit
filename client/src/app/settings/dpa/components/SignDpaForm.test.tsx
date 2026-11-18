import React from "react";
import { DPA_VERSION } from "@rybbit/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signDpa: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  downloadBlob: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string>) =>
    message.replace(/\{(\w+)\}/g, (_, key) => values?.[key] ?? ""),
}));
vi.mock("@/api/admin/endpoints/dpa", () => ({ signDpa: mocks.signDpa }));
vi.mock("@/components/ui/sonner", () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));
vi.mock("@/lib/export", () => ({ downloadBlob: mocks.downloadBlob }));

import { SignDpaForm } from "./SignDpaForm";

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SignDpaForm organizationId="org-1" defaults={{ signerName: "Jo Example", signerEmail: "jo@acme.example" }} />
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

  it("signs the version it showed, with the trimmed details, and downloads the PDF", async () => {
    mocks.signDpa.mockResolvedValue({ filename: "rybbit-dpa-acme.pdf", pdf: btoa("%PDF-test"), emailed: true });
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
      dpaVersion: DPA_VERSION,
      agreed: true,
    });
    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "DPA signed. The PDF is downloading, and we emailed a copy to jo@acme.example."
      )
    );
    const [filename, blob] = mocks.downloadBlob.mock.calls[0];
    expect(filename).toBe("rybbit-dpa-acme.pdf");
    expect(blob.type).toBe("application/pdf");
    expect(await blob.text()).toBe("%PDF-test");
  });
});
