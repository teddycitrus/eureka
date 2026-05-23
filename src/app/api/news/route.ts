import { db } from "@/lib/db";
import { guard, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = guard({
  rateLimit: { bucket: "news:get", windowSec: 60, max: 60 },
  handler: async () => {
    const items = await db.newsItem.findMany({
      orderBy: { publishedAt: "desc" },
      take: 100,
      include: { alerts: { include: { supplier: true } } },
    });
    return ok(items);
  },
});
