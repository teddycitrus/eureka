import { z } from "zod";
import { db } from "@/lib/db";
import { bus } from "@/lib/events";
import { guard, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const shipmentInput = z.object({
  ref: z.string().min(1).max(64),
  mode: z.enum(["ocean", "air", "rail", "truck"]).default("ocean"),
  originLabel: z.string().min(1).max(120),
  originLat: z.number().min(-90).max(90),
  originLng: z.number().min(-180).max(180),
  destLabel: z.string().min(1).max(120),
  destLat: z.number().min(-90).max(90),
  destLng: z.number().min(-180).max(180),
  waypoints: z
    .array(z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]))
    .max(50)
    .default([]),
  valueUSD: z.number().min(0).max(1e12).optional(),
  etaAt: z.string().datetime().optional(),
  supplierId: z.string().min(1).max(64).optional(),
  alertId: z.string().min(1).max(64).optional(),
});

export const GET = guard({
  rateLimit: { bucket: "shipments:get", windowSec: 60, max: 60 },
  handler: async () => {
    const shipments = await db.shipment.findMany({
      orderBy: { updatedAt: "desc" },
      include: { supplier: true, alert: true },
    });
    return ok(shipments);
  },
});

export const POST = guard({
  body: shipmentInput,
  requireOrigin: true,
  requireAdmin: "demo",
  rateLimit: { bucket: "shipments:post", windowSec: 60, max: 10 },
  handler: async ({ body }) => {
    const { waypoints, etaAt, ...rest } = body;
    const created = await db.shipment.create({
      data: {
        ...rest,
        waypoints: JSON.stringify(waypoints),
        etaAt: etaAt ? new Date(etaAt) : undefined,
      },
    });
    bus.emit({ type: "shipment.created", shipmentId: created.id });
    return ok(created, { status: 201 });
  },
});
