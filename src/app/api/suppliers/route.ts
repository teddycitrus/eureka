import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const supplierInput = z.object({
  name: z.string().min(1).max(160),
  region: z.string().min(1).max(80),
  country: z.string().min(1).max(80),
  categories: z.array(z.string().min(1).max(40)).max(20).default([]),
  tier: z.number().int().min(1).max(5).default(1),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).default("low"),
  notes: z.string().max(2000).optional(),
});

export const GET = guard({
  rateLimit: { bucket: "suppliers:get", windowSec: 60, max: 60 },
  handler: async () => {
    const suppliers = await db.supplier.findMany({
      include: { contacts: { include: { contact: true } }, alerts: true },
      orderBy: { createdAt: "desc" },
    });
    return ok(suppliers);
  },
});

export const POST = guard({
  body: supplierInput,
  requireOrigin: true,
  requireAdmin: "demo",
  rateLimit: { bucket: "suppliers:post", windowSec: 60, max: 10 },
  handler: async ({ body }) => {
    const { categories, ...rest } = body;
    const created = await db.supplier.create({
      data: { ...rest, categories: JSON.stringify(categories) },
    });
    return ok(created, { status: 201 });
  },
});
