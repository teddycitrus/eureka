# Deploying Eureka to Vercel (free tier)

Stack: **Vercel Hobby** (host) + **Turso** (database) + **Upstash Redis** (rate limiting). All three have free tiers that comfortably cover a portfolio demo.

---

## 1. Rotate every secret in `.env`

The original `.env` lived on disk and is now considered compromised. Rotate first, then keep the new values only in Vercel.

- Gemini → https://aistudio.google.com/app/apikey → revoke + new key
- Twilio → console → Account → API keys → roll the auth token
- Vapi → dashboard → API keys → revoke + new
- ElevenLabs → settings → API keys → revoke + new
- NewsAPI → re-issue
- `WEBHOOK_SHARED_SECRET` → `openssl rand -hex 32`
- `ADMIN_TOKEN` → `openssl rand -hex 32`

## 2. Provision Turso (database)

```bash
# https://turso.tech — sign up, install CLI
turso db create eureka-prod
turso db show eureka-prod --url      # → TURSO_DATABASE_URL
turso db tokens create eureka-prod   # → TURSO_AUTH_TOKEN
```

Push the schema:

```bash
DATABASE_URL=$TURSO_DATABASE_URL TURSO_AUTH_TOKEN=$TURSO_AUTH_TOKEN \
  npx prisma db push
```

Then seed it (one time):

```bash
DATABASE_URL=$TURSO_DATABASE_URL TURSO_AUTH_TOKEN=$TURSO_AUTH_TOKEN \
  npm run db:seed
```

## 3. Provision Upstash Redis

- https://console.upstash.com → Create Database → Global, free tier.
- Copy the REST URL + REST token → `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

Without this the rate limits still work locally but won't share state across serverless invocations — meaning the per-phone and global daily call caps become per-instance (worse limits than intended).

## 4. Push the repo + import on Vercel

```bash
git remote add origin git@github.com:<you>/eureka.git
git push -u origin main
```

- https://vercel.com → Add New → Project → import the GitHub repo.
- Framework auto-detects Next.js. Build command: leave default (`prisma generate && next build`).
- Add every variable from `.env.example` under **Environment Variables**. Mark `Production` + `Preview` for everything except `DEMO_MODE` (Production only).

Key production values:

| Variable | Value |
| --- | --- |
| `DEMO_MODE` | `true` |
| `PUBLIC_BASE_URL` | `https://<your-project>.vercel.app` |
| `ALLOWED_ORIGINS` | same as `PUBLIC_BASE_URL` |
| `ADMIN_TOKEN` | from step 1 |
| `WEBHOOK_SHARED_SECRET` | from step 1 |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | from step 2 |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | from step 3 |
| `DEMO_CALL_MAX_PER_DAY` | start at `10` while testing, raise later |

Trigger a deploy. Once live, point Vapi's `serverUrl` (in the assistant config or dashboard) at `https://<your-project>.vercel.app/api/calls/vapi-webhook`.

## 5. Sanity check

```bash
curl -i https://<your-project>.vercel.app/api/globe
# expect 200 + X-Content-Type-Options + Strict-Transport-Security
curl -i -X POST https://<your-project>.vercel.app/api/contacts -d '{}'
# expect 401 (mutations are locked in demo mode)
curl -i -X POST https://<your-project>.vercel.app/api/demo/call-me \
  -H 'content-type: application/json' \
  -d '{"phone":"+1invalid"}'
# expect 400 — phone regex / region check
```

## 6. Cost ceiling

Per-day worst case at default caps:

- 30 calls × ~$0.05 avg (US, 90s, Vapi+Twilio+ElevenLabs) ≈ **$1.50/day**.
- One bad actor maxing it = still bounded; Upstash counter resets at 00:00 UTC.
- Vercel, Turso, Upstash, NewsAPI free-tier usage: **$0**.

Adjust `DEMO_CALL_MAX_PER_DAY` to whatever you're comfortable with.
