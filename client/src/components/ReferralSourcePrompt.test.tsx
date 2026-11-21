import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ userId: "u_1" as string | undefined, identify: vi.fn() }));

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));
vi.mock("@/lib/const", async importOriginal => ({ ...(await importOriginal<object>()), IS_CLOUD: true }));
vi.mock("@/lib/userStore", () => ({
  userStore: (select: (state: { user?: { id: string } }) => unknown) =>
    select({ user: mocks.userId ? { id: mocks.userId } : undefined }),
}));
// Radix's select needs pointer capture and layout that jsdom lacks; a native one keeps the contract.
vi.mock("@/components/ui/select", () => ({
  Select: ({ onValueChange, children }: { onValueChange: (value: string) => void; children: React.ReactNode }) => (
    <select aria-label="source" defaultValue="" onChange={event => onValueChange(event.target.value)}>
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

import { askReferralSourceLater, ReferralSourcePrompt } from "./ReferralSourcePrompt";

const ASK_KEY = "rybbit-ask-referral-source";

beforeEach(() => {
  mocks.userId = "u_1";
  mocks.identify.mockReset();
  window.localStorage.clear();
  window.rybbit = { identify: mocks.identify } as unknown as typeof window.rybbit;
});

afterEach(cleanup);

describe("ReferralSourcePrompt", () => {
  it("stays out of the way unless signup asked for it in this browser", () => {
    const { container } = render(<ReferralSourcePrompt />);

    expect(container.firstChild).toBeNull();
  });

  it("records the answer against the user and doesn't ask again", () => {
    askReferralSourceLater();
    render(<ReferralSourcePrompt />);
    expect(screen.getByText("How did you find Rybbit?")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("source"), { target: { value: "hacker-news" } });

    expect(mocks.identify).toHaveBeenCalledWith("u_1", { source: "hacker-news" });
    expect(screen.queryByText("How did you find Rybbit?")).toBeNull();
    expect(window.localStorage.getItem(ASK_KEY)).toBeNull();
  });

  it("can be closed without answering, for good", () => {
    askReferralSourceLater();
    render(<ReferralSourcePrompt />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(mocks.identify).not.toHaveBeenCalled();
    expect(screen.queryByText("How did you find Rybbit?")).toBeNull();
    expect(window.localStorage.getItem(ASK_KEY)).toBeNull();
  });

  it("waits for a signed-in user before asking", () => {
    askReferralSourceLater();
    mocks.userId = undefined;
    const { container } = render(<ReferralSourcePrompt />);

    expect(container.firstChild).toBeNull();
    expect(window.localStorage.getItem(ASK_KEY)).toBe("1");
  });
});
