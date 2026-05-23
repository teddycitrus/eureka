import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const STATUS_VALUES = ["pending", "calling", "resolved", "escalated", "dismissed"] as const;

export const GET = guard({
  rateLimit: { bucket: "alerts:get", windowSec: 60, max: 60 },
  handler: async ({ req }) => {
    const statusParam = req.nextUrl.searchParams.get("status");
    const status = STATUS_VALUES.includes(statusParam as (typeof STATUS_VALUES)[number])
      ? (statusParam as (typeof STATUS_VALUES)[number])
      : undefined;
    const alerts = await db.alert.findMany({
      where: status ? { status } : undefined,
      include: {
        news: true,
        supplier: { include: { contacts: { include: { contact: true } } } },
        calls: { include: { contact: true } },
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 200,
    });
    return ok(alerts);
  },
});

const patchSchema = z.object({
  id: z.string().min(1).max(64),
  status: z.enum(STATUS_VALUES).optional(),
  decision: z.string().max(500).optional(),
  decisionMaker: z.string().max(120).optional(),
});

export const PATCH = guard({
  body: patchSchema,
  requireOrigin: true,
  requireAdmin: "demo",
  rateLimit: { bucket: "alerts:patch", windowSec: 60, max: 30 },
  handler: async ({ body }) => {
    const updated = await db.alert.update({
      where: { id: body.id },
      data: {
        status: body.status,
        decision: body.decision,
        decisionMaker: body.decisionMaker,
      },
    });
    return ok(updated);
  },
});
