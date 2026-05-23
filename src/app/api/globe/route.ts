import { db } from "@/lib/db";
import { parseList } from "@/lib/utils";
import { guard, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/globe
 * Snapshot for the 3D globe — supplier markers (with active alert metadata)
 * and shipment arcs (with waypoints expanded into individual segments).
 */
export const GET = guard({
  rateLimit: { bucket: "globe:get", windowSec: 60, max: 120 },
  handler: async () => {
    const [suppliers, shipments, alerts] = await Promise.all([
      db.supplier.findMany({
        where: { latitude: { not: null }, longitude: { not: null } },
        include: {
          alerts: {
            where: { status: { in: ["pending", "calling", "escalated"] } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      db.shipment.findMany({
        orderBy: { updatedAt: "desc" },
        include: { supplier: true, alert: true },
      }),
      db.alert.findMany({
        where: { status: { in: ["pending", "calling", "escalated"] } },
        include: { supplier: true, news: true },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    const markers = suppliers.map((s) => {
      const top = s.alerts[0];
      return {
        id: s.id,
        name: s.name,
        country: s.country,
        region: s.region,
        lat: s.latitude!,
        lng: s.longitude!,
        severity: top?.severity ?? s.riskLevel,
        hasAlert: Boolean(top),
        alertId: top?.id ?? null,
        categories: parseList<string>(s.categories),
      };
    });

    const arcs = shipments.flatMap((sh) => {
      const wp = parseList<[number, number]>(sh.waypoints);
      const path: Array<[number, number]> = [
        [sh.originLat, sh.originLng],
        ...wp,
        [sh.destLat, sh.destLng],
      ];
      return path.slice(0, -1).map(([lat, lng], i) => ({
        shipmentId: sh.id,
        ref: sh.ref,
        mode: sh.mode,
        status: sh.status,
        segIndex: i,
        startLat: lat,
        startLng: lng,
        endLat: path[i + 1][0],
        endLng: path[i + 1][1],
        originLabel: sh.originLabel,
        destLabel: sh.destLabel,
        valueUSD: sh.valueUSD,
      }));
    });

    return ok({
      markers,
      arcs,
      incidents: alerts.map((a) => ({
        id: a.id,
        supplierId: a.supplierId,
        lat: a.supplier.latitude,
        lng: a.supplier.longitude,
        severity: a.severity,
        headline: a.news.title,
        status: a.status,
        recommendation: a.recommendation,
        createdAt: a.createdAt,
      })),
      shipments: shipments.map((sh) => ({
        id: sh.id,
        ref: sh.ref,
        mode: sh.mode,
        status: sh.status,
        origin: sh.originLabel,
        dest: sh.destLabel,
        valueUSD: sh.valueUSD,
        etaAt: sh.etaAt,
        supplierName: sh.supplier?.name ?? null,
        alertId: sh.alertId,
      })),
    });
  },
});
