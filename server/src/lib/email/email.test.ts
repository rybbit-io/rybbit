import { beforeEach, describe, expect, it, vi } from "vitest";

// The Resend SDK resolves failed requests as { data: null, error } rather than rejecting;
// these tests pin that the helpers read `error` instead of treating the call as a success.
const mocks = vi.hoisted(() => ({
  emailsSend: vi.fn(),
  audiencesList: vi.fn(),
  audiencesCreate: vi.fn(),
  contactsGet: vi.fn(),
  contactsUpdate: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.emailsSend };
    audiences = { list: mocks.audiencesList, create: mocks.audiencesCreate };
    contacts = { get: mocks.contactsGet, update: mocks.contactsUpdate };
  },
}));

vi.mock("../const.js", () => ({ IS_CLOUD: true }));

const { isContactUnsubscribed, sendEmail, unsubscribeContact } = await import("./email.js");

const rateLimited = { data: null, error: { name: "rate_limit_exceeded", message: "Too many requests" } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.audiencesList.mockResolvedValue({ data: { data: [{ id: "aud_1", name: "Marketing" }] }, error: null });
});

describe("sendEmail", () => {
  it("resolves when Resend accepts the email", async () => {
    mocks.emailsSend.mockResolvedValue({ data: { id: "email_1" }, error: null });

    await expect(sendEmail("a@example.com", "Hi", "<p>Hi</p>")).resolves.toMatchObject({ data: { id: "email_1" } });
  });

  it("throws when Resend reports an error instead of logging it as sent", async () => {
    mocks.emailsSend.mockResolvedValue(rateLimited);

    await expect(sendEmail("a@example.com", "Hi", "<p>Hi</p>")).rejects.toThrow("rate_limit_exceeded");
  });
});

describe("isContactUnsubscribed", () => {
  it("reports the contact's unsubscribed flag", async () => {
    mocks.contactsGet.mockResolvedValue({ data: { unsubscribed: false }, error: null });
    await expect(isContactUnsubscribed("a@example.com")).resolves.toBe(false);

    mocks.contactsGet.mockResolvedValue({ data: { unsubscribed: true }, error: null });
    await expect(isContactUnsubscribed("a@example.com")).resolves.toBe(true);
  });

  it("skips contacts that were never added to the audience", async () => {
    mocks.contactsGet.mockResolvedValue({ data: null, error: { name: "not_found", message: "Contact not found" } });

    await expect(isContactUnsubscribed("a@example.com")).resolves.toBe(true);
  });

  it("throws on a rate limit instead of treating the contact as unsubscribed", async () => {
    mocks.contactsGet.mockResolvedValue(rateLimited);

    await expect(isContactUnsubscribed("a@example.com")).rejects.toThrow("rate_limit_exceeded");
  });
});

describe("unsubscribeContact", () => {
  it("throws when Resend rejects the update, so the caller doesn't confirm it", async () => {
    mocks.contactsUpdate.mockResolvedValue(rateLimited);

    await expect(unsubscribeContact("a@example.com")).rejects.toThrow("rate_limit_exceeded");
  });

  it("treats a contact outside the audience as already unsubscribed", async () => {
    mocks.contactsUpdate.mockResolvedValue({ data: null, error: { name: "not_found", message: "Contact not found" } });

    await expect(unsubscribeContact("a@example.com")).resolves.toBeUndefined();
  });
});
