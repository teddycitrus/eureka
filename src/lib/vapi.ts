import { env } from "./env";
import { elevenLabsVoiceConfig } from "./elevenlabs";
import { REROUTE_PRESETS } from "./reroute";

/**
 * Thin wrapper around the Vapi REST API.
 * Eureka places outbound calls by POSTing to /call/phone with an inline
 * assistant configured to read a supply-chain alert briefing and capture
 * the on-call manager's decision.
 */

const VAPI_BASE = "https://api.vapi.ai";

type VapiCallResponse = { id: string; status?: string };

export type ShipmentBrief = {
  ref: string;
  origin: string;
  dest: string;
  mode: string;
  status: string;
  valueUSD?: number | null;
};

export type AssistantBriefing = {
  alertId: string;
  contactName: string;
  supplierName: string;
  region: string;
  severity: string;
  headline: string;
  summary: string;
  recommendation: string;
  shipments?: ShipmentBrief[];
};

/** Build the system prompt for the on-call voice agent. */
function buildSystemPrompt(b: AssistantBriefing): string {
  const shipmentsBlock =
    b.shipments && b.shipments.length > 0
      ? [
          "",
          "── LINKED SHIPMENTS ──",
          ...b.shipments.map(
            (s) =>
              `- ${s.ref} | ${s.mode} | ${s.origin} → ${s.dest} | status: ${s.status}${
                s.valueUSD ? ` | value: $${Math.round(s.valueUSD).toLocaleString()}` : ""
              }`,
          ),
        ].join("\n")
      : "";

  const presetList = Object.entries(REROUTE_PRESETS)
    .map(([key, v]) => `  • ${key} — ${v.label}`)
    .join("\n");

  return [
    "You are Eureka, an interactive supply-chain risk briefing agent calling on behalf of the operations team.",
    `You are calling ${b.contactName} about a ${b.severity.toUpperCase()} risk affecting ${b.supplierName} (${b.region}).`,
    "",
    "Conversation flow:",
    "1. Greet the contact briefly, identify yourself as Eureka from the operations desk.",
    "2. Confirm you have ~60 seconds for an urgent supply-chain update — wait for acknowledgement.",
    "3. Read the briefing below (paraphrase concisely, do not list everything verbatim).",
    "4. Read the recommendation, then ask which decision they want to take:",
    "   (a) APPROVE the recommended action",
    "   (b) HOLD and reassess later",
    "   (c) ESCALATE to another stakeholder",
    "   (d) DISMISS as non-actionable",
    "5. If shipments are linked and the contact wants to reroute one, call the `reroute_shipment` tool with the shipment reference and a preset.",
    "6. If the contact wants to escalate, ask who to escalate to.",
    "7. Repeat back their decision in one sentence to confirm.",
    "8. Thank them and end the call.",
    "",
    "Always call `record_decision` before saying goodbye with the captured outcome.",
    "Be concise, professional, and human. Do not invent facts beyond the briefing.",
    "Never read shipment refs character-by-character — say 'shipment PO 9821' as 'PO ninety-eight twenty-one'.",
    "",
    "Available reroute presets (only these are valid):",
    presetList,
    "",
    "── BRIEFING ──",
    `Headline: ${b.headline}`,
    `Summary: ${b.summary}`,
    `Recommended action: ${b.recommendation}`,
    shipmentsBlock,
  ].join("\n");
}

function buildAssistant(b: AssistantBriefing) {
  return {
    name: `eureka-alert-${b.alertId}`,
    firstMessage: `Hi ${b.contactName}, this is Eureka from the operations desk — do you have about a minute for an urgent supply-chain briefing on ${b.supplierName}?`,
    voice: elevenLabsVoiceConfig(),
    model: {
      provider: "google" as const,
      model: env.geminiModel(),
      temperature: 0.3,
      messages: [{ role: "system", content: buildSystemPrompt(b) }],
      tools: [
        {
          type: "function" as const,
          function: {
            name: "record_decision",
            description:
              "Record the contact's decision on the alert and end the call after confirmation.",
            parameters: {
              type: "object",
              properties: {
                outcome: {
                  type: "string",
                  enum: ["approve", "hold", "escalate", "dismiss"],
                },
                escalateTo: {
                  type: "string",
                  description: "Name or role of person to escalate to (only when outcome=escalate).",
                },
                notes: { type: "string" },
              },
              required: ["outcome"],
            },
          },
        },
        {
          type: "function" as const,
          function: {
            name: "reroute_shipment",
            description:
              "Reroute a linked shipment along a named maritime/air corridor. The Eureka globe will redraw the route in real time. Use when the contact agrees to redirect a specific shipment.",
            parameters: {
              type: "object",
              properties: {
                shipmentRef: {
                  type: "string",
                  description:
                    "The shipment reference exactly as it appears in the briefing (e.g. 'PO-9821-TW').",
                },
                via: {
                  type: "string",
                  enum: Object.keys(REROUTE_PRESETS),
                  description: "Named reroute corridor.",
                },
                reason: {
                  type: "string",
                  description: "One-sentence justification, e.g. 'Panama Canal congestion'.",
                },
              },
              required: ["shipmentRef", "via"],
            },
          },
        },
      ],
    },
    transcriber: { provider: "deepgram" as const, model: "nova-2", language: "en" },
    endCallFunctionEnabled: true,
    serverUrl: `${env.publicBaseUrl()}/api/calls/vapi-webhook`,
    serverUrlSecret: env.webhookSecret(),
    silenceTimeoutSeconds: 25,
    maxDurationSeconds: 300,
    analysisPlan: {
      summaryPrompt:
        "In 2-3 sentences, summarise: which supplier/region was discussed, what decision the contact gave (approve/hold/escalate/dismiss), and any escalation target or next-step they named. Plain text, no preamble.",
    },
  };
}

/** Place an outbound voice call via Vapi (which dials through the imported Twilio number). */
export async function placeAlertCall(opts: {
  briefing: AssistantBriefing;
  toPhone: string;
  metadata?: Record<string, unknown>;
}): Promise<VapiCallResponse> {
  const assistant = buildAssistant(opts.briefing);
  const body: Record<string, unknown> = {
    phoneNumberId: env.vapiPhoneNumberId(),
    customer: { number: opts.toPhone, name: opts.briefing.contactName },
    metadata: { alertId: opts.briefing.alertId, ...opts.metadata },
  };
  const existingAssistantId = env.vapiAssistantId();
  if (existingAssistantId) {
    body.assistantId = existingAssistantId;
    body.assistantOverrides = {
      firstMessage: assistant.firstMessage,
      model: assistant.model,
      variableValues: {
        contactName: opts.briefing.contactName,
        supplierName: opts.briefing.supplierName,
        severity: opts.briefing.severity,
      },
    };
  } else {
    body.assistant = assistant;
  }

  const res = await fetch(`${VAPI_BASE}/call/phone`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.vapiKey()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vapi call create failed (${res.status}): ${text}`);
  }
  return (await res.json()) as VapiCallResponse;
}

export type DemoBriefing = {
  supplierName: string;
  region: string;
  severity: string;
  headline: string;
  summary: string;
  recommendation: string;
};

/**
 * Place a short demo call to a recruiter-supplied number. The agent reads
 * one of Eureka's seeded supply-chain briefings (Taiwan typhoon, Chilean
 * lithium strike, etc.) so the caller hears a representative example of
 * the real alert flow — just without any tools, transcript retention, or
 * decision capture. Strictly capped in duration; never reuse this for the
 * production alert flow.
 */
export async function placeDemoCall(opts: {
  toPhone: string;
  callerLabel: string;
  maxSeconds: number;
  briefing: DemoBriefing;
}): Promise<VapiCallResponse> {
  const { briefing: b, callerLabel } = opts;
  const systemPrompt = [
    "You are Eureka — a supply-chain risk briefing voice agent built as a portfolio demo.",
    `You are calling ${callerLabel}, who clicked a button on the Eureka demo page to hear a sample briefing.`,
    "",
    "Conversation flow (keep the whole call under 60 seconds):",
    `1. Greet ${callerLabel} warmly by name. Identify yourself as Eureka from the operations desk and say you have a sample supply-chain briefing to share.`,
    "2. Read the briefing below — paraphrase concisely, do not list everything verbatim.",
    "3. State the recommended next step in one sentence.",
    `4. Ask ${callerLabel} one short question — what is the most interesting use of voice agents they have seen — and react warmly to whatever they say (one sentence).`,
    "5. Thank them, mention that the live version of Eureka actually captures a decision and can reroute shipments, then end the call.",
    "",
    "Hard rules:",
    "- Do not collect personal information.",
    "- Do not promise anything beyond what is in the briefing.",
    "- Do not invent details beyond the briefing below.",
    "- Never read references character-by-character — say 'PO 9821' as 'PO ninety-eight twenty-one'.",
    "",
    "── SAMPLE BRIEFING ──",
    `Supplier: ${b.supplierName} (${b.region})`,
    `Severity: ${b.severity.toUpperCase()}`,
    `Headline: ${b.headline}`,
    `Summary: ${b.summary}`,
    `Recommended action: ${b.recommendation}`,
  ].join("\n");

  const assistant = {
    name: "eureka-demo",
    firstMessage: `Hi ${callerLabel}! This is Eureka from the operations desk — do you have about thirty seconds for a sample supply-chain briefing?`,
    voice: elevenLabsVoiceConfig(),
    model: {
      provider: "google" as const,
      model: env.geminiModel(),
      temperature: 0.4,
      messages: [{ role: "system", content: systemPrompt }],
    },
    transcriber: { provider: "deepgram" as const, model: "nova-2", language: "en" },
    endCallFunctionEnabled: true,
    silenceTimeoutSeconds: 15,
    maxDurationSeconds: opts.maxSeconds,
    // Webhook so the demo can trigger a follow-up SMS summary at end-of-call.
    serverUrl: `${env.publicBaseUrl()}/api/calls/vapi-webhook`,
    serverUrlSecret: env.webhookSecret(),
    analysisPlan: {
      summaryPrompt: [
        `In 2-3 sentences, summarise the sample supply-chain briefing this caller (${callerLabel}) just heard about ${b.supplierName}.`,
        "Include the headline of the risk and one concrete next-step recommendation. Plain text, no preamble.",
      ].join(" "),
    },
  };

  const body: Record<string, unknown> = {
    phoneNumberId: env.vapiPhoneNumberId(),
    customer: { number: opts.toPhone },
    // Metadata is echoed back on every webhook event so the handler can tell
    // demo calls apart from production alert calls (which it looks up in the
    // DB by vapiCallId) and knows where to text the summary.
    metadata: {
      kind: "demo",
      toPhone: opts.toPhone,
      callerLabel,
      supplierName: b.supplierName,
    },
    assistant,
  };

  const res = await fetch(`${VAPI_BASE}/call/phone`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.vapiKey()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vapi demo call failed (${res.status}): ${text}`);
  }
  return (await res.json()) as VapiCallResponse;
}

export async function getVapiCall(callId: string) {
  const res = await fetch(`${VAPI_BASE}/call/${callId}`, {
    headers: { authorization: `Bearer ${env.vapiKey()}` },
  });
  if (!res.ok) throw new Error(`Vapi call lookup failed: ${res.status}`);
  return res.json();
}
