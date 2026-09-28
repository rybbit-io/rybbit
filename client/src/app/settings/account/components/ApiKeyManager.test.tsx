import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiKeyManager } from "./ApiKeyManager";

const SECRET = "rb_live_7f3a9c2e";

const mocks = vi.hoisted(() => {
  const createKey = vi.fn();
  return {
    createKey,
    toastError: vi.fn(),
    writeText: vi.fn<(text: string) => Promise<void>>(),
    keyHooks: () => ({ mutateAsync: createKey, isPending: false }),
    listHook: () => ({ data: { apiKeys: [] }, isLoading: false, isError: false, error: null, refetch: vi.fn() }),
  };
});

vi.mock("next-intl", () => ({
  useExtracted: () => (message: string, values?: Record<string, string | number>) =>
    values ? message.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`)) : message,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../../../../api/admin/hooks/useUserApiKeys", () => ({
  useCreateApiKey: mocks.keyHooks,
  useDeleteApiKey: mocks.keyHooks,
  useListApiKeys: mocks.listHook,
}));

vi.mock("../../../../api/admin/hooks/useOrgApiKeys", () => ({
  useCreateOrgApiKey: mocks.keyHooks,
  useDeleteOrgApiKey: mocks.keyHooks,
  useListOrgApiKeys: mocks.listHook,
}));

vi.mock("../../../../lib/subscription/useStripeSubscription", () => ({
  useStripeSubscription: () => ({ data: { planName: "pro" } }),
}));

vi.mock("../../../../lib/const", async importOriginal => ({
  ...(await importOriginal<typeof import("../../../../lib/const")>()),
  IS_CLOUD: false,
}));

vi.mock("./ApiKeyScopePicker", () => ({ ApiKeyScopePicker: () => null, getScopeLabel: (scope: string) => scope }));

vi.mock("@/components/ui/sonner", () => ({ toast: { success: vi.fn(), error: mocks.toastError } }));

async function createKey() {
  render(<ApiKeyManager />);
  fireEvent.change(screen.getByLabelText("API Key Name"), { target: { value: "Deploy script" } });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  return screen.findByRole("dialog", { name: "API Key Created" });
}

beforeEach(() => {
  mocks.createKey.mockResolvedValue({ key: SECRET });
  Object.defineProperty(navigator, "clipboard", { value: { writeText: mocks.writeText }, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("ApiKeyManager reveal dialog", () => {
  it("asks for a second step before closing when the key hasn't been copied", async () => {
    const dialog = await createKey();
    expect(within(dialog).getByText(SECRET)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));

    expect(dialog.isConnected).toBe(true);
    expect(within(dialog).getByRole("alert").textContent).toContain("You haven't copied this key yet.");

    fireEvent.click(within(dialog).getByRole("button", { name: "Close anyway" }));

    await waitFor(() => expect(dialog.isConnected).toBe(false));
  });

  it("guards Escape the same way", async () => {
    const dialog = await createKey();

    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(dialog.isConnected).toBe(true);
    expect(within(dialog).getByRole("alert")).toBeTruthy();
  });

  it("closes straight away once the key was copied with the button", async () => {
    mocks.writeText.mockResolvedValue(undefined);
    const dialog = await createKey();

    fireEvent.click(within(dialog).getByRole("button", { name: "Copy key" }));
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Copy key" }).dataset.status).toBe("copied"));
    expect(mocks.writeText).toHaveBeenCalledWith(SECRET);

    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));

    await waitFor(() => expect(dialog.isConnected).toBe(false));
  });

  it("counts selecting the key and copying it by hand", async () => {
    const dialog = await createKey();
    const code = within(dialog).getByText(SECRET);
    const range = document.createRange();
    range.selectNodeContents(code);
    document.getSelection()!.removeAllRanges();
    document.getSelection()!.addRange(range);

    fireEvent.copy(code);
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));

    await waitFor(() => expect(dialog.isConnected).toBe(false));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps the manual-copy advice when the copy button fails", async () => {
    mocks.writeText.mockRejectedValue(new DOMException("Write permission denied.", "NotAllowedError"));
    const dialog = await createKey();

    fireEvent.click(within(dialog).getByRole("button", { name: "Copy key" }));

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith("Couldn't copy to clipboard. Select the key and copy it manually.")
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(within(dialog).getByRole("alert")).toBeTruthy();
  });
});
