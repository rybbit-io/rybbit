import { createHmac, timingSafeEqual } from "crypto";
import { SECRET } from "./const.js";

/**
 * HMAC signatures for links that leave the app in emails (unsubscribe,
 * install checks) so the endpoints can't be driven with arbitrary values.
 */
export function signPayload(payload: string): string {
  return createHmac("sha256", SECRET || "").update(payload).digest("base64url");
}

export function verifySignedPayload(payload: string, signature: string): boolean {
  const expected = Buffer.from(signPayload(payload));
  const provided = Buffer.from(signature);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
