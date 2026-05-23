import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const contactInput = z.object({
  name: z.string().min(1).max(120),
  role: z.string().min(1).max(120),
  phone: z.string().regex(/^\+\d{6,15}$/, "phone must be E.164"),
  email: z.string().email().max(200).optional(),
  receiveCalls: z.boolean().default(true),
  escalation: z.number().int().min(1).max(5).default(1),
  supplierIds: z.array(z.string().min(1).max(64)).max(50).default([]),
});

export const GET = guard({
  rateLimit: { bucket: "contacts:get", windowSec: 60, max: 60 },
  handler: async () => {
    const contacts = await db.contact.findMany({
      include: { suppliers: { include: { supplier: true } } },
      orderBy: { createdAt: "desc" },
    });
    return ok(contacts);
  },
});

export const POST = guard({
  body: contactInput,
  requireOrigin: true,
  requireAdmin: "demo",
  rateLimit: { bucket: "contacts:post", windowSec: 60, max: 10 },
  handler: async ({ body }) => {
    const { supplierIds, ...rest } = body;
    const created = await db.contact.create({
      data: {
        ...rest,
        suppliers: { create: supplierIds.map((sid) => ({ supplierId: sid })) },
      },
    });
    return ok(created, { status: 201 });
  },
});
