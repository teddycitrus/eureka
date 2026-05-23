import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const patchInput = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.string().min(1).max(120).optional(),
  phone: z.string().regex(/^\+\d{6,15}$/).optional(),
  email: z.string().email().max(200).nullable().optional(),
  receiveCalls: z.boolean().optional(),
  escalation: z.number().int().min(1).max(5).optional(),
  supplierIds: z.array(z.string().min(1).max(64)).max(50).optional(),
});

const idSchema = z.string().min(1).max(64);

export const PATCH = guard<z.infer<typeof patchInput>, { id: string }>({
  body: patchInput,
  requireOrigin: true,
  requireAdmin: "demo",
  rateLimit: { bucket: "contacts:patch", windowSec: 60, max: 20 },
  handler: async ({ body, params }) => {
    const id = idSchema.parse(params.id);
    const { supplierIds, ...rest } = body;
    const updated = await db.contact.update({
      where: { id },
      data: {
        ...rest,
        ...(supplierIds && {
          suppliers: {
            deleteMany: {},
            create: supplierIds.map((sid) => ({ supplierId: sid })),
          },
        }),
      },
      include: { suppliers: { include: { supplier: true } } },
    });
    return ok(updated);
  },
});

export const DELETE = guard<unknown, { id: string }>({
  requireOrigin: true,
  requireAdmin: "demo",
  rateLimit: { bucket: "contacts:delete", windowSec: 60, max: 20 },
  handler: async ({ params }) => {
    const id = idSchema.parse(params.id);
    await db.contact.delete({ where: { id } });
    return ok({ ok: true });
  },
});
