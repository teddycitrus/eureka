import { z } from "zod";
import { placeDemoCall } from "@/lib/vapi";
import { guard, ok } from "@/lib/api";
import { hashId } from "@/lib/auth";
import { limit, retryAfterSec } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { verifyTurnstile } from "@/lib/captcha";

export const dynamic = "force-dynamic";

/**
 * Public "call me" demo endpoint.
 *
 * Defence-in-depth, in this order:
 *   1. Origin check — only requests from our own pages are accepted.
 *   2. Per-IP rate limit (1/hour) — handled by guard().
 *   3. Region whitelist — only the country prefixes in DEMO_CALL_REGIONS.
 *   4. Per-phone-number throttle (1/24h) — keyed off a hash of the number.
 *   5. Global daily cap (DEMO_CALL_MAX_PER_DAY) — absolute spending ceiling.
 *   6. Strict Vapi assistant config — 90s max, no tools, no data captured.
 *
 * If any of the above fail we return 429 with a Retry-After header.
 */

const phoneRegex = /^\+\d{8,15}$/;
const labelRegex = /^[\p{L}\p{N}\s\-'.,]{1,40}$/u;

const input = z.object({
  phone: z.string().regex(phoneRegex, "phone must be E.164 (e.g. +14155551212)"),
  name: z.string().regex(labelRegex, "name has unsupported characters").max(40).optional(),
  // Cloudflare Turnstile token. Optional in the schema because the server
  // only enforces it when TURNSTILE_SECRET_KEY is configured.
  captchaToken: z.string().max(2048).optional(),
});

export const POST = guard({
  body: input,
  requireOrigin: true,
  rateLimit: { bucket: "demo:call-me:ip", windowSec: 3600, max: 1 },
  handler: async ({ body, ip }) => {
    const phone = body.phone;
    const callerLabel = (body.name ?? "friend").trim();

    // CAPTCHA — verified before any other expensive check so a flood of
    // bot submissions can't burn through rate-limit slots.
    const captcha = await verifyTurnstile(body.captchaToken, ip);
    if (!captcha.ok) {
      return ok(
        { error: `captcha failed: ${captcha.reason}` },
        { status: 403 },
      );
    }

    // Region whitelist — phone must start with one of the allowed prefixes.
    const allowedPrefixes = env.demoCallRegions();
    if (!allowedPrefixes.some((p) => phone.startsWith(p))) {
      return ok(
        {
          error: "phone region not supported",
          allowedPrefixes,
        },
        { status: 400 },
      );
    }

    // Per-phone limit (1/24h, keyed off SHA-256 of the number so we don't
    // store raw phone numbers anywhere).
    const phoneCheck = await limit(hashId(phone), {
      bucket: "demo:call-me:phone",
      windowSec: 86_400,
      max: 1,
    });
    if (!phoneCheck.ok) {
      const retry = retryAfterSec(phoneCheck);
      return ok(
        {
          error: "this number was already called today — try again tomorrow",
          retryAfter: retry,
        },
        { status: 429, headers: { "Retry-After": String(retry) } },
      );
    }

    // Global daily budget — single shared counter, resets at midnight UTC.
    const day = new Date().toISOString().slice(0, 10);
    const globalCheck = await limit(day, {
      bucket: "demo:call-me:global",
      windowSec: 86_400,
      max: env.demoCallMaxPerDay(),
    });
    if (!globalCheck.ok) {
      const retry = retryAfterSec(globalCheck);
      return ok(
        {
          error: "the demo is at its daily call cap — try again tomorrow",
          retryAfter: retry,
        },
        { status: 429, headers: { "Retry-After": String(retry) } },
      );
    }

    try {
      const call = await placeDemoCall({
        toPhone: phone,
        callerLabel,
        maxSeconds: env.demoCallMaxSeconds(),
      });
      return ok({
        ok: true,
        callId: call.id,
        status: call.status ?? "initiated",
        message: "ringing — expect a call in 5–15 seconds",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "call failed";
      console.error("[demo:call-me] vapi failed", message);
      return ok(
        { error: "voice provider rejected the call — try again later" },
        { status: 502 },
      );
    }
  },
});
