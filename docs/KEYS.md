# Eureka — required API keys

Drop these into `.env` (start from `.env.example`).

| Key                       | Where to get it                                                         | Required? |
| ------------------------- | ----------------------------------------------------------------------- | --------- |
| `GEMINI_API_KEY`          | https://aistudio.google.com/app/apikey                                  | yes       |
| `NEWSAPI_KEY`             | https://newsapi.org/  (free tier works)                                 | optional† |
| `TWILIO_ACCOUNT_SID`      | https://console.twilio.com/  → Account Info                             | yes       |
| `TWILIO_AUTH_TOKEN`       | https://console.twilio.com/  → Account Info                             | yes       |
| `TWILIO_PHONE_NUMBER`     | Buy at https://console.twilio.com/  → Phone Numbers (Voice-capable, E.164) | yes       |
| `VAPI_API_KEY`            | https://dashboard.vapi.ai/  → API Keys (private)                        | yes       |
| `VAPI_PHONE_NUMBER_ID`    | Vapi dashboard → Phone Numbers → Import the Twilio number you bought    | yes       |
| `VAPI_ASSISTANT_ID`       | Optional pre-built assistant; leave blank for inline                    | optional  |
| `ELEVENLABS_API_KEY`      | https://elevenlabs.io/app/settings/api-keys                             | yes       |
| `ELEVENLABS_VOICE_ID`     | https://elevenlabs.io/app/voice-library                                 | optional  |
| `WEBHOOK_SHARED_SECRET`   | Generate locally: `openssl rand -hex 16`                                | yes       |
| `PUBLIC_BASE_URL`         | Your dev tunnel (ngrok) or prod origin — Vapi posts events here         | yes       |

† without NEWSAPI Eureka falls back to a stub feed so the UI still works.

## Wiring Twilio ↔ Vapi

1. Buy a voice-capable number in Twilio.
2. In the Vapi dashboard, **Phone Numbers → Import from Twilio**, paste your SID/token + the number.
3. Copy the resulting `phoneNumberId` into `VAPI_PHONE_NUMBER_ID`.
4. Vapi will then handle the SIP/PSTN side; you don't configure TwiML yourself.

## Local webhooks

Vapi posts call lifecycle events to `/api/calls/vapi-webhook`. To receive them
in dev, run an HTTPS tunnel and set `PUBLIC_BASE_URL`:

```bash
ngrok http 3000
# copy the https URL into PUBLIC_BASE_URL in .env
```

The webhook is signed via `x-vapi-secret` using `WEBHOOK_SHARED_SECRET`.
