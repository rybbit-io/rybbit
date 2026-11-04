import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyTotp: vi.fn(),
  verifyBackupCode: vi.fn(),
}));

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("@/lib/auth", () => ({
  authClient: { twoFactor: { verifyTotp: mocks.verifyTotp, verifyBackupCode: mocks.verifyBackupCode } },
}));

import { TwoFactorStep } from "./TwoFactorStep";

const user = { id: "user-1", email: "user@example.com" };

async function submit(code: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: code } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
  });
}

beforeEach(() => {
  // The Radix checkbox renders a hidden input inside the form and measures it.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  mocks.verifyTotp.mockReset().mockResolvedValue({ data: { token: "t", user }, error: null });
  mocks.verifyBackupCode.mockReset().mockResolvedValue({ data: { token: "t", user }, error: null });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TwoFactorStep", () => {
  it("verifies an authenticator code and hands back the user", async () => {
    const onVerified = vi.fn();
    render(<TwoFactorStep onVerified={onVerified} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("checkbox"));
    await submit("123 456");
    expect(mocks.verifyTotp).toHaveBeenCalledWith({ code: "123456", trustDevice: true });
    expect(onVerified).toHaveBeenCalledWith(user);
  });

  it("switches to backup codes", async () => {
    render(<TwoFactorStep onVerified={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Use a backup code" }));
    expect(screen.getByLabelText("Backup code")).toBeTruthy();
    await submit("abcde-fghij");
    expect(mocks.verifyBackupCode).toHaveBeenCalledWith({ code: "abcde-fghij", trustDevice: false });
    expect(mocks.verifyTotp).not.toHaveBeenCalled();
  });

  it("shows the server's message for a wrong code and stays on the step", async () => {
    mocks.verifyTotp.mockResolvedValue({ data: null, error: { code: "INVALID_CODE", message: "Invalid code" } });
    const onVerified = vi.fn();
    render(<TwoFactorStep onVerified={onVerified} onCancel={vi.fn()} />);
    await submit("000000");
    expect(screen.getByText("Invalid code")).toBeTruthy();
    expect(onVerified).not.toHaveBeenCalled();
  });

  it("explains an expired challenge instead of calling the code invalid", async () => {
    mocks.verifyTotp.mockResolvedValue({
      data: null,
      error: { code: "INVALID_TWO_FACTOR_COOKIE", message: "Invalid two factor cookie" },
    });
    render(<TwoFactorStep onVerified={vi.fn()} onCancel={vi.fn()} />);
    await submit("123456");
    expect(screen.getByText("This sign-in has expired. Go back and sign in again.")).toBeTruthy();
  });

  it("leaves an OAuth redirect to the auth client", async () => {
    mocks.verifyTotp.mockResolvedValue({
      data: { redirect: true, url: "https://example.com/auth/consent" },
      error: null,
    });
    const onVerified = vi.fn();
    render(<TwoFactorStep onVerified={onVerified} onCancel={vi.fn()} />);
    await submit("123456");
    expect(onVerified).not.toHaveBeenCalled();
  });

  it("goes back to the password form", () => {
    const onCancel = vi.fn();
    render(<TwoFactorStep onVerified={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Back to sign in" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
