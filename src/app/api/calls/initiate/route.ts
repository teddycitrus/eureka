import { z } from "zod";
import { db } from "@/lib/db";
import { placeAlertCall } from "@/lib/vapi";
import { bus } from "@/lib/events";
import { guard, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const input = z.object({
  alertId: z.string().min(1).max(64),
  contactId: z.string().min(1).max(64).optional(),
});

/**
 * POST /api/calls/initiate
 * Kicks off an outbound voice agent call for the given alert. This route
 * costs real money per invocation so it's admin-only when DEMO_MODE is on.
 */
export const POST = guard({
  body: input,
  requireOrigin: true,
  requireAdmin: "demo",
  rateLimit: { bucket: "calls:initiate", windowSec: 60, max: 10 },
  handler: async ({ body }) => {
    const { alertId, contactId } = body;
    const alert = await db.alert.findUnique({
      where: { id: alertId },
      include: {
        news: true,
        shipments: true,
        supplier: {
          include: {
            contacts: {
              include: { contact: true },
              orderBy: { contact: { escalation: "asc" } },
            },
            shipments: { take: 5, orderBy: { updatedAt: "desc" } },
          },
        },
      },
    });
    if (!alert) return ok({ error: "alert not found" }, { status: 404 });

    const candidate = contactId
      ? alert.supplier.contacts.find((c) => c.contactId === contactId)?.contact
      : alert.supplier.contacts.find((c) => c.contact.receiveCalls)?.contact;

    if (!candidate) {
      return ok(
        { error: "no callable contact mapped to supplier" },
        { status: 400 },
      );
    }

    const linkedShipments = [
      ...alert.shipments,
      ...alert.supplier.shipments.filter(
        (s) => !alert.shipments.some((x) => x.id === s.id),
      ),
    ];

    try {
      const vapi = await placeAlertCall({
        toPhone: candidate.phone,
        briefing: {
          alertId: alert.id,
          contactName: candidate.name,
          supplierName: alert.supplier.name,
          region: alert.supplier.region,
          severity: alert.severity,
          headline: alert.news.title,
          summary: alert.news.summary,
          recommendation: alert.recommendation,
          shipments: linkedShipments.map((s) => ({
            ref: s.ref,
            origin: s.originLabel,
            dest: s.destLabel,
            mode: s.mode,
            status: s.status,
            valueUSD: s.valueUSD,
          })),
        },
      });

      const call = await db.call.create({
        data: {
          alertId: alert.id,
          contactId: candidate.id,
          vapiCallId: vapi.id,
          status: vapi.status ?? "initiated",
        },
      });
      await db.alert.update({
        where: { id: alert.id },
        data: { status: "calling" },
      });
      bus.emit({ type: "call.started", callId: call.id, alertId: alert.id });
      bus.emit({ type: "alert.updated", alertId: alert.id, status: "calling" });

      return ok({ call, vapi });
    } catch (err) {
      const message = err instanceof Error ? err.message : "call failed";
      await db.call.create({
        data: {
          alertId: alert.id,
          contactId: candidate.id,
          status: "failed",
          transcript: `error: ${message}`,
        },
      });
      return ok({ error: "call failed" }, { status: 502 });
    }
  },
});
