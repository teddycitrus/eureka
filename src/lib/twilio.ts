import twilio from "twilio";
import { env } from "./env";

let _client: ReturnType<typeof twilio> | null = null;

export function twilioClient() {
  if (!_client) _client = twilio(env.twilioSid(), env.twilioToken());
  return _client;
}

/**
 * Direct Twilio dial (used as a fallback when Vapi isn't reachable).
 * In normal operation Vapi orchestrates the call and uses Twilio under the hood.
 */
export async function placeFallbackCall(opts: {
  to: string;
  twimlUrl: string;
}) {
  return twilioClient().calls.create({
    to: opts.to,
    from: env.twilioNumber(),
    url: opts.twimlUrl,
    method: "POST",
  });
}

/**
 * Send an SMS via Twilio. Body is hard-capped at 320 chars (2 standard segments)
 * to keep per-message cost predictable and avoid carrier truncation surprises.
 * Throws on send failure — callers should wrap in try/catch since SMS is
 * always a best-effort side-channel, never a blocking step.
 */
export async function sendSms(opts: { to: string; body: string }) {
  const body = opts.body.length > 320 ? `${opts.body.slice(0, 317)}...` : opts.body;
  return twilioClient().messages.create({
    to: opts.to,
    from: env.twilioNumber(),
    body,
  });
}
