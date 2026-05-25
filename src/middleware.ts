import { NextResponse, type NextRequest } from "next/server";

/**
 * Global security headers + cheap defensive checks on every request.
 *
 * Heavier per-route protection (rate limiting, admin gate, zod validation)
 * lives in `lib/api.ts` and runs inside each handler — middleware here is
 * for things that apply to the entire surface uniformly.
 */

const CSP = [
  "default-src 'self'",
  // Next.js requires inline styles for streaming RSC + font preload. Same for
  // `unsafe-eval` only in dev (react-refresh). Production builds drop both.
  // challenges.cloudflare.com is required for the Turnstile widget script.
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com" +
    (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.upstash.io https://api.vapi.ai https://challenges.cloudflare.com",
  // Turnstile renders inside an iframe served from challenges.cloudflare.com.
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const STATIC_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  for (const [k, v] of Object.entries(STATIC_HEADERS)) res.headers.set(k, v);
  res.headers.set("Content-Security-Policy", CSP);

  if (req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return res;
}

export const config = {
  // Run on everything except framework internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
