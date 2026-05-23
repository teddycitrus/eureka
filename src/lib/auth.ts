import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { env } from "./env";

/** Constant-time string compare. Strings of differing length always return false. */
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/** Pull the client IP out of standard proxy headers. Falls back to "unknown". */
export function clientIp(req: NextRequest | Request): string {
  const headers = "headers" in req ? req.headers : new Headers();
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    headers.get("x-vercel-forwarded-for") ??
    "unknown"
  );
}

/** Hash any identifier (IP, phone) before using it as a rate-limit key. */
export function hashId(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

/** Returns true when the request carries a valid admin bearer token. */
export function hasAdminToken(req: NextRequest | Request): boolean {
  const expected = env.adminToken();
  if (!expected) return false; // no token configured = admin disabled
  const headers = "headers" in req ? req.headers : new Headers();
  const raw =
    headers.get("authorization") ??
    headers.get("x-admin-token") ??
    "";
  const presented = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
  return safeEqual(presented, expected);
}

/**
 * Returns true when the request's Origin (or Referer) belongs to one of
 * the configured allowed origins. Server-to-server callers without an
 * Origin header (e.g. webhooks) pass this check — webhooks have their own
 * signature verification.
 */
function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function originAllowed(req: NextRequest | Request): boolean {
  const headers = "headers" in req ? req.headers : new Headers();
  const origin = headers.get("origin");
  const referer = headers.get("referer");
  const candidate = origin ?? (referer ? originOf(referer) : null);
  if (!candidate) return true; // no header → likely curl/webhook; rely on other auth

  // Same-origin always allowed. We construct what our own origin looks like
  // from the request's Host header (which proxies set to the public hostname)
  // so this works regardless of how PUBLIC_BASE_URL is configured.
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const proto = headers.get("x-forwarded-proto") ?? "https";
  if (host) {
    const sameOrigin = `${proto}://${host}`;
    if (candidate === sameOrigin) return true;
  }

  // Dev escape hatch: localhost is fine when NODE_ENV !== "production".
  if (!env.isProd() && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(candidate)) {
    return true;
  }

  // Explicit allow-list (for cross-origin callers, e.g. a separate dashboard).
  const allowed = env.allowedOrigins().map((a) => originOf(a) ?? a.replace(/\/$/, ""));
  return allowed.includes(candidate);
}

/** True when mutation routes should be rejected (or admin-token-gated). */
export function mutationsLocked(): boolean {
  return env.isDemo();
}
