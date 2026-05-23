import { z } from "zod";

/**
 * Centralised, validated environment. Reads are lazy so server-only modules
 * don't get loaded into the client bundle, and missing required keys throw
 * a descriptive error instead of "undefined.replace is not a function" at
 * request time.
 */

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // App
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),
  DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  ADMIN_TOKEN: z.string().min(16).optional(),
  ALLOWED_ORIGINS: z.string().optional(),

  // Webhooks
  WEBHOOK_SHARED_SECRET: z.string().optional(),

  // Database (Turso/libSQL in prod, file: in dev)
  DATABASE_URL: z.string().default("file:./dev.db"),
  TURSO_DATABASE_URL: z.string().url().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),

  // Rate limiting (Upstash Redis). When unset the limiter falls back to
  // in-memory — fine for dev, useless on multi-instance serverless.
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // LLM / news
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  NEWSAPI_KEY: z.string().optional(),

  // Voice stack
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  VAPI_API_KEY: z.string().optional(),
  VAPI_PHONE_NUMBER_ID: z.string().optional(),
  VAPI_ASSISTANT_ID: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID: z.string().default("21m00Tcm4TlvDq8ikWAM"),
  ELEVENLABS_MODEL_ID: z.string().default("eleven_turbo_v2_5"),

  // Demo call-me feature caps
  DEMO_CALL_REGIONS: z.string().default("+1,+44,+61"),
  DEMO_CALL_MAX_PER_DAY: z.coerce.number().int().positive().default(30),
  DEMO_CALL_MAX_SECONDS: z.coerce.number().int().positive().default(90),
});

type Parsed = z.infer<typeof schema>;

let cached: Parsed | null = null;

function parsed(): Parsed {
  if (cached) return cached;
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  cached = result.data;
  return cached;
}

function need<K extends keyof Parsed>(key: K): NonNullable<Parsed[K]> {
  const v = parsed()[key];
  if (v === undefined || v === "") {
    throw new Error(`Missing required env var ${String(key)}`);
  }
  return v as NonNullable<Parsed[K]>;
}

export const env = {
  nodeEnv: () => parsed().NODE_ENV,
  isProd: () => parsed().NODE_ENV === "production",
  isDemo: () => parsed().DEMO_MODE === true,

  publicBaseUrl: () => parsed().PUBLIC_BASE_URL,
  adminToken: () => parsed().ADMIN_TOKEN ?? "",
  allowedOrigins: (): string[] => {
    const raw = parsed().ALLOWED_ORIGINS;
    if (raw) return raw.split(",").map((s) => s.trim()).filter(Boolean);
    return [parsed().PUBLIC_BASE_URL];
  },

  webhookSecret: () => parsed().WEBHOOK_SHARED_SECRET ?? "",

  databaseUrl: () => parsed().DATABASE_URL,
  tursoUrl: () => parsed().TURSO_DATABASE_URL ?? "",
  tursoToken: () => parsed().TURSO_AUTH_TOKEN ?? "",

  upstashUrl: () => parsed().UPSTASH_REDIS_REST_URL ?? "",
  upstashToken: () => parsed().UPSTASH_REDIS_REST_TOKEN ?? "",

  geminiKey: () => need("GEMINI_API_KEY"),
  geminiModel: () => parsed().GEMINI_MODEL,
  newsApiKey: () => parsed().NEWSAPI_KEY ?? "",

  twilioSid: () => need("TWILIO_ACCOUNT_SID"),
  twilioToken: () => need("TWILIO_AUTH_TOKEN"),
  twilioNumber: () => need("TWILIO_PHONE_NUMBER"),

  vapiKey: () => need("VAPI_API_KEY"),
  vapiPhoneNumberId: () => need("VAPI_PHONE_NUMBER_ID"),
  vapiAssistantId: () => parsed().VAPI_ASSISTANT_ID ?? "",

  elevenLabsKey: () => need("ELEVENLABS_API_KEY"),
  elevenLabsVoiceId: () => parsed().ELEVENLABS_VOICE_ID,
  elevenLabsModel: () => parsed().ELEVENLABS_MODEL_ID,

  demoCallRegions: (): string[] =>
    parsed()
      .DEMO_CALL_REGIONS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  demoCallMaxPerDay: () => parsed().DEMO_CALL_MAX_PER_DAY,
  demoCallMaxSeconds: () => parsed().DEMO_CALL_MAX_SECONDS,
};

export type Env = typeof env;
