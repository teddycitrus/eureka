import { db } from "@/lib/db";
import { guard, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = guard({
  rateLimit: { bucket: "calls:get", windowSec: 60, max: 60 },
  handler: async () => {
    const calls = await db.call.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        contact: true,
        alert: { include: { news: true, supplier: true } },
      },
    });
    return ok(calls);
  },
});
