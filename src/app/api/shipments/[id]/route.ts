import { z } from "zod";
import { db } from "@/lib/db";
import { bus } from "@/lib/events";
import { guard, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const patchInput = z.object({
  status: z
    .enum(["on-track", "rerouted", "delayed", "held", "arrived"])
    .optional(),
  waypoints: z
    .array(z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]))
    .max(50)
    .optional(),
  destLabel: z.string().min(1).max(120).optional(),
  destLat: z.number().min(-90).max(90).optional(),
  destLng: z.number().min(-180).max(180).optional(),
  etaAt: z.string().datetime().nullable().optional(),
  reason: z.string().max(500).optional(),
});

const idSchema = z.string().min(1).max(64);

export const PATCH = guard<z.infer<typeof patchInput>, { id: string }>({
  body: patchInput,
  requireOrigin: true,
  requireAdmin: "demo",
  rateLimit: { bucket: "shipments:patch", windowSec: 60, max: 20 },
  handler: async ({ body, params }) => {
    const id = idSchema.parse(params.id);
    const { waypoints, etaAt, reason: _reason, ...rest } = body;
    const updated = await db.shipment.update({
      where: { id },
      data: {
        ...rest,
        ...(waypoints && { waypoints: JSON.stringify(waypoints) }),
        ...(etaAt !== undefined && { etaAt: etaAt ? new Date(etaAt) : null }),
      },
    });
    bus.emit({
      type: "shipment.updated",
      shipmentId: updated.id,
      status: updated.status,
    });
    return ok(updated);
  },
});

export const DELETE = guard<unknown, { id: string }>({
  requireOrigin: true,
  requireAdmin: "demo",
  rateLimit: { bucket: "shipments:delete", windowSec: 60, max: 20 },
  handler: async ({ params }) => {
    const id = idSchema.parse(params.id);
    await db.shipment.delete({ where: { id } });
    bus.emit({ type: "shipment.updated", shipmentId: id, status: "deleted" });
    return ok({ ok: true });
  },
});
