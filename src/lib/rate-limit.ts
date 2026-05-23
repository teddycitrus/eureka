import { env } from "./env";

/**
 * Sliding-window rate limiter.
 *
 * Prefers Upstash Redis REST (free tier covers 10K commands/day) so multiple
 * serverless invocations share the same counter. Falls back to an in-memory
 * Map for local dev — anything multi-instance without Redis will overcount
 * but never undercount.
 */

export type LimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
};

export type LimitSpec = {
  /** Bucket name — prefixed onto the key so different routes don't collide. */
  bucket: string;
  /** Window size in seconds. */
  windowSec: number;
  /** Maximum requests allowed in the window. */
  max: number;
};

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, spec: LimitSpec): LimitResult {
  const now = Date.now();
  const existing = memory.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + spec.windowSec * 1000;
    memory.set(key, { count: 1, resetAt });
    return { ok: true, remaining: spec.max - 1, resetAt, limit: spec.max };
  }
  existing.count += 1;
  const ok = existing.count <= spec.max;
  return {
    ok,
    remaining: Math.max(0, spec.max - existing.count),
    resetAt: existing.resetAt,
    limit: spec.max,
  };
}

async function upstashLimit(key: string, spec: LimitSpec): Promise<LimitResult> {
  const url = env.upstashUrl();
  const token = env.upstashToken();
  // Pipeline: INCR + (EXPIRE NX) so the TTL is set on the first hit only.
  const body = [
    ["INCR", key],
    ["EXPIRE", key, String(spec.windowSec), "NX"],
    ["PTTL", key],
  ];
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    // On Redis failure, fail OPEN — better to serve a recruiter than to lock
    // the demo because of a transient Upstash hiccup. The other limit layers
    // still apply.
    return { ok: true, remaining: spec.max, resetAt: Date.now() + spec.windowSec * 1000, limit: spec.max };
  }
  const data = (await res.json()) as Array<{ result?: number; error?: string }>;
  const count = Number(data[0]?.result ?? 0);
  const pttl = Number(data[2]?.result ?? spec.windowSec * 1000);
  const resetAt = Date.now() + (pttl > 0 ? pttl : spec.windowSec * 1000);
  return {
    ok: count <= spec.max,
    remaining: Math.max(0, spec.max - count),
    resetAt,
    limit: spec.max,
  };
}

/**
 * Consume one token. `key` should already be scoped to the identifier you
 * want to rate-limit on (IP, phone, route, etc.). Caller is responsible for
 * stable hashing of PII before passing it in.
 */
export async function limit(key: string, spec: LimitSpec): Promise<LimitResult> {
  const fullKey = `rl:${spec.bucket}:${key}`;
  if (env.upstashUrl() && env.upstashToken()) {
    try {
      return await upstashLimit(fullKey, spec);
    } catch {
      // Fall through to memory limiter on transport failure.
    }
  }
  return memoryLimit(fullKey, spec);
}

/** Build a Retry-After header value (in seconds) from a LimitResult. */
export function retryAfterSec(r: LimitResult): number {
  return Math.max(1, Math.ceil((r.resetAt - Date.now()) / 1000));
}
