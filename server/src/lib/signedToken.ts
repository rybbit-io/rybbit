import { createHmac, timingSafeEqual } from "crypto";
import { SECRET } from "./const.js";

/**
 * HMAC signatures for links that leave the app in emails (unsubscribe,
 * install checks) so the endpoints can't be driven with arbitrary values.
 */
export function signPayload(payload: string): string {
  return createHmac("sha256", SECRET || "").update(payload).digest("base64url");
}

/**
 * Constant-time equality for two strings. Both sides are encoded as UTF-16LE,
 * which keeps every code unit distinct (UTF-8 would turn each lone surrogate
 * into U+FFFD and accept values that `===` rejects). Lengths are compared
 * first because timingSafeEqual throws on buffers of different length.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf16le");
  const right = Buffer.from(b, "utf16le");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifySignedPayload(payload: string, signature: string): boolean {
  const expected = Buffer.from(signPayload(payload));
  const provided = Buffer.from(signature);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

/**
 * Expiring variant: the expiry is part of the signed payload and travels in
 * the URL, so a leaked link cannot be replayed indefinitely.
 */
export function signExpiringPayload(payload: string, ttlSeconds: number): { exp: number; sig: string } {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return { exp, sig: signPayload(`${payload}:${exp}`) };
}

export function verifyExpiringPayload(payload: string, exp: number | string, signature: string): boolean {
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now() / 1000) return false;
  return verifySignedPayload(`${payload}:${Math.floor(expNum)}`, signature);
}
