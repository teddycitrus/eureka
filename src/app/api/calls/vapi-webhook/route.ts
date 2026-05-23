import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bus } from "@/lib/events";
import { REROUTE_PRESETS, isReroutePreset } from "@/lib/reroute";
import { verifyVapiWebhook } from "@/lib/webhook-verify";
import { limit, retryAfterSec } from "@/lib/rate-limit";
import { clientIp, hashId } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Vapi posts assistant lifecycle events here:
 *   - status-update      (queued → ringing → in-progress → ended)
 *   - function-call      (when the assistant invokes record_decision)
 *   - end-of-call-report (final transcript + summary)
 */
export async function POST(req: NextRequest) {
  // Per-source rate limit so a flood of replayed webhooks can't pin our DB.
  const rl = await limit(hashId(clientIp(req)), {
    bucket: "vapi-webhook",
    windowSec: 60,
    max: 120,
  });
  if (!rl.ok) {
    const retryAfter = retryAfterSec(rl);
    return NextResponse.json(
      { error: "rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  if (!verifyVapiWebhook(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: VapiServerMessage;
  try {
    payload = (await req.json()) as VapiServerMessage;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const message = payload?.message ?? (payload as unknown as VapiInnerMessage);
  if (!message) return NextResponse.json({ ok: true });

  const vapiCallId = message.call?.id;
  if (!vapiCallId) return NextResponse.json({ ok: true });

  const call = await db.call.findFirst({ where: { vapiCallId } });
  if (!call) return NextResponse.json({ ok: true, note: "unknown call" });

  switch (message.type) {
    case "status-update":
      await db.call.update({
        where: { id: call.id },
        data: { status: typeof message.status === "string" ? message.status.slice(0, 32) : call.status },
      });
      break;

    case "function-call": {
      const fn = message.functionCall;
      const args = (fn?.parameters ?? fn?.arguments ?? {}) as Record<string, unknown>;

      if (fn?.name === "record_decision") {
        const decision = String(args.outcome ?? "unknown").slice(0, 32);
        const notes = typeof args.notes === "string" ? args.notes.slice(0, 500) : null;
        const escalateTo = typeof args.escalateTo === "string" ? args.escalateTo.slice(0, 120) : null;
        await db.call.update({
          where: { id: call.id },
          data: { outcome: decision },
        });
        await db.alert.update({
          where: { id: call.alertId },
          data: {
            status:
              decision === "approve"
                ? "resolved"
                : decision === "escalate"
                  ? "escalated"
                  : decision === "dismiss"
                    ? "dismissed"
                    : "pending",
            decision: [decision, notes].filter(Boolean).join(" — "),
            decisionMaker: escalateTo,
          },
        });
        bus.emit({
          type: "call.outcome",
          callId: call.id,
          outcome: decision,
          alertId: call.alertId,
        });
        return NextResponse.json({
          result: "Decision recorded. Thanks — ending the call now.",
        });
      }

      if (fn?.name === "reroute_shipment") {
        const ref = String(args.shipmentRef ?? "").slice(0, 64);
        const via = String(args.via ?? "");
        const reason = typeof args.reason === "string" ? args.reason.slice(0, 200) : null;
        if (!ref || !isReroutePreset(via)) {
          return NextResponse.json({
            result: "I couldn't find that shipment or that corridor isn't supported.",
          });
        }
        const shipment = await db.shipment.findFirst({ where: { ref } });
        if (!shipment) {
          return NextResponse.json({
            result: `I don't see shipment ${ref} on the list — could you re-state the reference?`,
          });
        }
        const preset = REROUTE_PRESETS[via];
        await db.shipment.update({
          where: { id: shipment.id },
          data: {
            waypoints: JSON.stringify(preset.waypoints),
            status: "rerouted",
          },
        });
        bus.emit({
          type: "shipment.updated",
          shipmentId: shipment.id,
          status: "rerouted",
        });
        return NextResponse.json({
          result: `Rerouting ${ref} ${preset.label}${reason ? ` — noted: ${reason}` : ""}. The map is updating now.`,
        });
      }

      return NextResponse.json({ result: "Acknowledged." });
    }

    case "end-of-call-report": {
      const rawTranscript =
        message.transcript ??
        message.artifact?.transcript ??
        (Array.isArray(message.messages)
          ? message.messages.map((m) => `${m.role}: ${m.message}`).join("\n")
          : null);
      // Hard cap transcript size so an oversized payload can't blow the row.
      const transcript = rawTranscript ? rawTranscript.slice(0, 20_000) : null;
      const duration =
        typeof message.durationSeconds === "number" &&
        Number.isFinite(message.durationSeconds)
          ? Math.max(0, Math.min(3600, Math.floor(message.durationSeconds)))
          : null;
      await db.call.update({
        where: { id: call.id },
        data: {
          status: "completed",
          transcript,
          durationSec: duration,
          endedAt: new Date(),
        },
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ ok: true });
}

// ── Loose typing for the Vapi event envelope ──────────────────────
type VapiInnerMessage = {
  type: string;
  call?: { id: string };
  status?: string;
  functionCall?: {
    name: string;
    parameters?: Record<string, unknown>;
    arguments?: Record<string, unknown>;
  };
  transcript?: string;
  durationSeconds?: number;
  artifact?: { transcript?: string };
  messages?: Array<{ role: string; message: string }>;
};
type VapiServerMessage = { message?: VapiInnerMessage };
