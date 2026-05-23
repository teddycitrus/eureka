import { createHmac } from "node:crypto";
import { env } from "./env";
import { safeEqual } from "./auth";

/**
 * Verify a Vapi webhook callback.
 *
 * Vapi forwards `serverUrlSecret` as either the `x-vapi-secret` header or
 * an Authorization bearer. We expect an exact match (constant-time compare).
 */
export function verifyVapiWebhook(req: Request): boolean {
  const expected = env.webhookSecret();
  if (!expected) return true; // no secret configured = open in dev
  const presented =
    req.headers.get("x-vapi-secret") ??
    (req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  return safeEqual(presented, expected);
}

/**
 * Verify a Twilio webhook signature.
 *
 * Twilio signs the full URL plus a key=value-sorted concatenation of POST
 * params with the account auth token (HMAC-SHA1, base64). See:
 * https://www.twilio.com/docs/usage/security#validating-requests
 *
 * Pass the raw POST params (form-decoded). For JSON bodies Twilio doesn't
 * send X-Twilio-Signature in the same form — verify out-of-band.
 */
export function verifyTwilioSignature(opts: {
  url: string;
  params: Record<string, string>;
  signature: string;
}): boolean {
  const token = env.twilioToken();
  if (!token) return false;
  const sortedKeys = Object.keys(opts.params).sort();
  const concat = sortedKeys.reduce(
    (acc, k) => acc + k + opts.params[k],
    opts.url,
  );
  const expected = createHmac("sha1", token).update(concat).digest("base64");
  return safeEqual(expected, opts.signature);
}
