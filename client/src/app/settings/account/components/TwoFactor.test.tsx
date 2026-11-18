import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TwoFactor } from "./TwoFactor";

const TOTP_URI = "otpauth://totp/Rybbit:user%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Rybbit";
const CODES = ["aaaaa-11111", "bbbbb-22222"];

type User = { id: string; email: string; twoFactorEnabled: boolean };

const mocks = vi.hoisted(() => ({
  user: null as User | null,
  providers: ["credential"],
  accountsError: false,
  enable: vi.fn(),
  verifyTotp: vi.fn(),
  disable: vi.fn(),
  generateBackupCodes: vi.fn(),
  writeText: vi.fn<(text: string) => Promise<void>>(),
}));

vi.mock("next-intl", () => {
  const t = (message: string, values?: Record<string, unknown>) =>
    values ? message.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`)) : message;
  return { useExtracted: () => t };
});
vi.mock("@/components/ui/sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../../../lib/auth", () => ({
  authClient: {
    useSession: () => ({ data: mocks.user ? { user: mocks.user } : null }),
    listAccounts: async () =>
      mocks.accountsError
        ? { data: null, error: { message: "Failed to list accounts" } }
        : { data: mocks.providers.map(providerId => ({ providerId })), error: null },
    twoFactor: {
      enable: mocks.enable,
      verifyTotp: mocks.verifyTotp,
      disable: mocks.disable,
      generateBackupCodes: mocks.generateBackupCodes,
    },
  },
}));

function renderRow() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <TwoFactor />
    </QueryClientProvider>
  );
  return {
    rerender: () =>
      view.rerender(
        <QueryClientProvider client={client}>
          <TwoFactor />
        </QueryClientProvider>
      ),
  };
}

async function submitPassword(dialog: HTMLElement, button: string, password = "secret-password") {
  fireEvent.change(within(dialog).getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(within(dialog).getByRole("button", { name: button }));
}

beforeEach(() => {
  mocks.user = { id: "user-1", email: "user@example.com", twoFactorEnabled: false };
  mocks.providers = ["credential"];
  mocks.accountsError = false;
  mocks.enable.mockResolvedValue({ data: { totpURI: TOTP_URI, backupCodes: CODES }, error: null });
  mocks.verifyTotp.mockResolvedValue({ data: { token: "t" }, error: null });
  mocks.disable.mockResolvedValue({ data: { status: true }, error: null });
  mocks.generateBackupCodes.mockResolvedValue({ data: { status: true, backupCodes: ["ccccc-33333"] }, error: null });
  mocks.writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText: mocks.writeText }, configurable: true });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("TwoFactor", () => {
  it("explains that Google and GitHub accounts use the provider's two-factor", async () => {
    mocks.providers = ["google"];
    renderRow();
    expect(await screen.findByText(/You sign in with Google or GitHub/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Turn on" })).toBeNull();
  });

  it("says so when the sign-in methods can't be loaded", async () => {
    mocks.accountsError = true;
    renderRow();
    expect(await screen.findByText("Couldn't load your sign-in methods.")).toBeTruthy();
    expect(screen.queryByText(/You sign in with Google or GitHub/)).toBeNull();
  });

  it("returns focus to Turn on when the setup is cancelled", async () => {
    renderRow();
    const turnOn = await screen.findByRole("button", { name: "Turn on" });
    fireEvent.click(turnOn);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(turnOn));
  });

  it("can't be closed while the first code is being checked", async () => {
    let finish: (value: unknown) => void = () => {};
    mocks.verifyTotp.mockReturnValue(new Promise(resolve => (finish = resolve)));
    renderRow();
    fireEvent.click(await screen.findByRole("button", { name: "Turn on" }));
    const dialog = screen.getByRole("dialog");
    await submitPassword(dialog, "Continue");
    fireEvent.change(await within(dialog).findByLabelText("Code from the app"), { target: { value: "123456" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Turn on" }));

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(dialog.isConnected).toBe(true);

    finish({ data: { token: "t" }, error: null });
    expect(await within(dialog).findByText(CODES[0])).toBeTruthy();
  });

  it("recovers when checking the first code fails to reach the server", async () => {
    mocks.verifyTotp.mockRejectedValue(new TypeError("Failed to fetch"));
    renderRow();
    fireEvent.click(await screen.findByRole("button", { name: "Turn on" }));
    const dialog = screen.getByRole("dialog");
    await submitPassword(dialog, "Continue");
    fireEvent.change(await within(dialog).findByLabelText("Code from the app"), { target: { value: "123456" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Turn on" }));
    expect((await within(dialog).findByRole("alert")).textContent).toBe("Something went wrong. Try again.");
    expect((within(dialog).getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("recovers when the password check fails to reach the server", async () => {
    mocks.enable.mockRejectedValue(new TypeError("Failed to fetch"));
    renderRow();
    fireEvent.click(await screen.findByRole("button", { name: "Turn on" }));
    const dialog = screen.getByRole("dialog");
    await submitPassword(dialog, "Continue");
    expect((await within(dialog).findByRole("alert")).textContent).toBe("Something went wrong. Try again.");
    expect((within(dialog).getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("turns two-factor on and keeps the backup codes on screen when the session flips to on", async () => {
    const row = renderRow();
    fireEvent.click(await screen.findByRole("button", { name: "Turn on" }));
    const dialog = screen.getByRole("dialog");
    await submitPassword(dialog, "Continue");

    expect(mocks.enable).toHaveBeenCalledWith({ password: "secret-password" });
    expect(await within(dialog).findByTitle("QR code for your authenticator app")).toBeTruthy();
    expect(within(dialog).getByText("JBSW Y3DP EHPK 3PXP")).toBeTruthy();

    fireEvent.change(within(dialog).getByLabelText("Code from the app"), { target: { value: "123 456" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Turn on" }));
    expect(await within(dialog).findByText(CODES[0])).toBeTruthy();
    expect(mocks.verifyTotp).toHaveBeenCalledWith({ code: "123456" });

    mocks.user = { ...mocks.user!, twoFactorEnabled: true };
    row.rerender();
    expect(screen.getByText("On")).toBeTruthy();
    expect(within(screen.getByRole("dialog")).getByText(CODES[1])).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(within(dialog).getByRole("alert").textContent).toContain("You haven't saved these codes yet.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Close anyway" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("shows the server's error for a wrong password and stays on the password step", async () => {
    mocks.enable.mockResolvedValue({ data: null, error: { message: "Invalid password" } });
    renderRow();
    fireEvent.click(await screen.findByRole("button", { name: "Turn on" }));
    const dialog = screen.getByRole("dialog");
    await submitPassword(dialog, "Continue");
    expect((await within(dialog).findByRole("alert")).textContent).toBe("Invalid password");
    expect(within(dialog).queryByTitle("QR code for your authenticator app")).toBeNull();
  });

  it("keeps the scan step open when the first code is wrong", async () => {
    mocks.verifyTotp.mockResolvedValue({ data: null, error: { message: "Invalid code" } });
    renderRow();
    fireEvent.click(await screen.findByRole("button", { name: "Turn on" }));
    const dialog = screen.getByRole("dialog");
    await submitPassword(dialog, "Continue");
    fireEvent.change(await within(dialog).findByLabelText("Code from the app"), { target: { value: "000000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Turn on" }));
    expect((await within(dialog).findByRole("alert")).textContent).toBe("Invalid code");
    expect(within(dialog).queryByText(CODES[0])).toBeNull();
  });

  it("turns two-factor off with the password", async () => {
    mocks.user = { ...mocks.user!, twoFactorEnabled: true };
    renderRow();
    fireEvent.click(await screen.findByRole("button", { name: "Turn off" }));
    const dialog = screen.getByRole("dialog");
    await submitPassword(dialog, "Turn off");
    await waitFor(() => expect(mocks.disable).toHaveBeenCalledWith({ password: "secret-password" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("replaces the backup codes and closes straight away once they're copied", async () => {
    mocks.user = { ...mocks.user!, twoFactorEnabled: true };
    renderRow();
    fireEvent.click(await screen.findByRole("button", { name: "New backup codes" }));
    const dialog = screen.getByRole("dialog");
    await submitPassword(dialog, "Create new codes");
    expect(await within(dialog).findByText("ccccc-33333")).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Copy codes" }));
    await waitFor(() => expect(mocks.writeText).toHaveBeenCalledWith("ccccc-33333"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
