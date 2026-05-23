/**
 * Cloudflare Turnstile verification.
 *
 * Server-side check that a CAPTCHA token presented by the client is real
 * and was issued for this site. We treat absence of TURNSTILE_SECRET_KEY
 * as "not configured, skip the check" so local dev and Preview deploys
 * keep working without keys.
 *
 * Free tier docs: https://developers.cloudflare.com/turnstile/get-started/
 */

type TurnstileResponse = {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
};

export async function verifyTurnstile(
  token: string | undefined,
  ip: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true }; // not configured = bypass
  if (!token) return { ok: false, reason: "captcha token missing" };

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
  });

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        cache: "no-store",
      },
    );
    if (!res.ok) {
      return { ok: false, reason: `verify request failed (${res.status})` };
    }
    const data = (await res.json()) as TurnstileResponse;
    if (data.success) return { ok: true };
    return {
      ok: false,
      reason: data["error-codes"]?.join(",") ?? "captcha rejected",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "verify failed";
    return { ok: false, reason: message };
  }
}
