import { createHmac } from "crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("./const.js", () => ({ SECRET: undefined }));

import { signPayload, verifySignedPayload } from "./signedToken.js";

describe("signed tokens without a configured secret", () => {
  it("refuses to sign and rejects signatures made with an empty secret", () => {
    const forged = createHmac("sha256", "").update("unsubscribe:victim@example.com").digest("base64url");
    expect(() => signPayload("unsubscribe:victim@example.com")).toThrow("BETTER_AUTH_SECRET");
    expect(verifySignedPayload("unsubscribe:victim@example.com", forged)).toBe(false);
  });
});
