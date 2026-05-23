import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import {
  clientIp,
  hashId,
  hasAdminToken,
  mutationsLocked,
  originAllowed,
} from "./auth";
import { env } from "./env";
import { limit, retryAfterSec, type LimitSpec } from "./rate-limit";

/**
 * Common wrapper for API route handlers. Each route picks the protections
 * it wants instead of every middleware running on every request:
 *
 *   - rateLimit         per-IP sliding window
 *   - requireOrigin     reject cross-origin browser POSTs
 *   - requireAdmin      requires ADMIN_TOKEN (always, if `true`) or only in
 *                       demo mode (`"demo"`)
 *   - body              zod schema to validate the JSON body against
 *
 * Errors are scrubbed: 5xx bodies never include the underlying message in
 * production. Logs still get the full error.
 */

export type HandlerCtx<TBody, TParams> = {
  req: NextRequest;
  params: TParams;
  body: TBody;
  ip: string;
};

type GuardOpts<TBody, TParams> = {
  rateLimit?: LimitSpec;
  requireOrigin?: boolean;
  requireAdmin?: boolean | "demo";
  // ZodType<Output, Def, Input> — accept any input shape but constrain the
  // output type to TBody so the handler sees the parsed/transformed value.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: ZodType<TBody, any, any>;
  handler: (ctx: HandlerCtx<TBody, TParams>) => Promise<Response> | Response;
};

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
};

function withSecurity(res: Response): Response {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!res.headers.has(k)) res.headers.set(k, v);
  }
  return res;
}

function jsonError(status: number, message: string, extra?: Record<string, unknown>): Response {
  return withSecurity(
    NextResponse.json({ error: message, ...extra }, { status }),
  );
}

export function guard<TBody = unknown, TParams = Record<string, string>>(
  opts: GuardOpts<TBody, TParams>,
) {
  return async function handle(
    req: NextRequest,
    routeCtx?: { params?: TParams },
  ): Promise<Response> {
    const ip = clientIp(req);

    // Origin check first — cheap and stops drive-by POSTs.
    if (opts.requireOrigin && !originAllowed(req)) {
      return jsonError(403, "forbidden origin");
    }

    // Admin gate. "demo" means only enforce when DEMO_MODE=true.
    const adminRequired =
      opts.requireAdmin === true ||
      (opts.requireAdmin === "demo" && mutationsLocked());
    if (adminRequired && !hasAdminToken(req)) {
      return jsonError(401, "unauthorized");
    }

    // Rate limit second so admins don't get rate-limited by their own
    // identity, but anonymous traffic does.
    if (opts.rateLimit && !adminRequired) {
      const result = await limit(hashId(ip), opts.rateLimit);
      if (!result.ok) {
        const retryAfter = retryAfterSec(result);
        const res = jsonError(429, "rate limit exceeded", { retryAfter });
        res.headers.set("Retry-After", String(retryAfter));
        res.headers.set("X-RateLimit-Limit", String(result.limit));
        res.headers.set("X-RateLimit-Remaining", "0");
        return res;
      }
    }

    // Body validation. Only attempt for methods that carry a body.
    let body: TBody = undefined as unknown as TBody;
    if (opts.body && req.method !== "GET" && req.method !== "HEAD") {
      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        return jsonError(400, "invalid json");
      }
      const parsed = opts.body.safeParse(raw);
      if (!parsed.success) {
        return jsonError(400, "invalid request body", {
          issues: parsed.error.flatten().fieldErrors,
        });
      }
      body = parsed.data;
    }

    try {
      const res = await opts.handler({
        req,
        params: (routeCtx?.params ?? {}) as TParams,
        body,
        ip,
      });
      return withSecurity(res);
    } catch (err) {
      // Surface validation errors thrown deep in the handler.
      if (err instanceof ZodError) {
        return jsonError(400, "invalid request", {
          issues: err.flatten().fieldErrors,
        });
      }
      const message = err instanceof Error ? err.message : String(err);
      console.error("[api] unhandled", { route: req.nextUrl.pathname, message });
      if (env.isProd()) {
        return jsonError(500, "internal error");
      }
      return jsonError(500, message);
    }
  };
}

/** Lightweight JSON helper that always sets security headers. */
export function ok(data: unknown, init?: ResponseInit): Response {
  return withSecurity(NextResponse.json(data, init));
}
