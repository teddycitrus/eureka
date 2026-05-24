# Eureka — Quickstart

Eureka watches news for supply-chain risk, scores it against your supplier graph,
and dispatches an interactive voice agent that calls the right stakeholder when
a decision is needed.

## 1 · Install

```bash
npm install
cp .env.example .env       # then fill in keys (see KEYS.md)
npx prisma db push
npm run db:seed
```

## 2 · Run

```bash
npm run dev
# open http://localhost:3000
```

The dashboard ("Pulse") is seeded with two demo alerts so you can immediately
exercise the voice-call flow.

## 3 · Trigger a voice call

From `/alerts`, click **Brief …** on any alert. Eureka will:

1. POST `/api/calls/initiate { alertId }`
2. Build a Vapi assistant inline with the alert briefing as system context
3. Vapi dials the contact's phone via the imported Twilio number
4. The call uses an ElevenLabs voice
5. The agent reads the briefing, asks for a decision, and calls `record_decision`
6. Vapi POSTs to `/api/calls/vapi-webhook` → Eureka updates the alert + transcript

For the webhook to reach you in dev, expose the server with ngrok:

```bash
ngrok http 3000
# put the public URL in PUBLIC_BASE_URL in .env
```

## 4 · Pull live news

```bash
# via the UI
click "Pull latest signals" on the dashboard, or "ingest now" on /news

# via CLI
npm run ingest -- "semiconductor OR shipping OR tariff"
```

If `NEWSAPI_KEY` isn't set, Eureka uses a curated stub feed so the UI is never empty.

## 5 · How the voice flow is wired

```
news (NewsAPI) ─► /api/news/ingest ─► risk.ts (Anthropic) ─► Alert row
                                                              │
                                       [user clicks Brief …]  ▼
                              /api/calls/initiate ──► Vapi /call/phone
                                                          │
                                                  Twilio places call
                                                          │
                                              ElevenLabs synthesizes voice
                                                          │
                                              record_decision tool fires
                                                          │
                              /api/calls/vapi-webhook ◄── Vapi event
                                  │
                                  ▼
                              Alert.status / decision / transcript
```

## 6 · Endpoints

| Method | Path                          | Purpose                                |
| ------ | ----------------------------- | -------------------------------------- |
| GET    | `/api/suppliers`              | list suppliers                         |
| POST   | `/api/suppliers`              | create supplier                        |
| GET    | `/api/contacts`               | list contacts                          |
| POST   | `/api/contacts`               | create contact (E.164 phone)           |
| POST   | `/api/news/ingest`            | pull + score + alert                   |
| GET    | `/api/news`                   | recent signals                         |
| GET    | `/api/alerts`                 | filter `?status=pending`               |
| PATCH  | `/api/alerts`                 | update decision/status                 |
| POST   | `/api/calls/initiate`         | dispatch voice agent for an alert      |
| POST   | `/api/calls/vapi-webhook`     | Vapi events (status, function, end)    |
| GET    | `/api/calls`                  | call log                               |
