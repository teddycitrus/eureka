import { db } from "@/lib/db";
import { Topbar } from "@/components/topbar";
import { parseList, severityFromScore, shortRelTime } from "@/lib/utils";
import { RiskBadge } from "@/components/risk-badge";
import { ExternalLink, Globe2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const items = await db.newsItem.findMany({
    orderBy: { publishedAt: "desc" },
    take: 100,
    include: { alerts: { include: { supplier: true } } },
  });

  return (
    <div className="flex flex-col">
      <Topbar
        title="Signals"
        subtitle="Raw news stream, scored for supply-chain relevance against your suppliers."
      />
      <div className="space-y-3 p-8">
        <div className="flex items-center justify-between">
          <p className="text-xs text-ink-muted">{items.length} items</p>
          <form action="/api/news/ingest" method="post">
            <button
              type="submit"
              className="rounded-lg border border-line bg-bg-raised/60 px-3 py-1.5 text-xs text-ink-muted hover:border-eureka-500/40 hover:text-ink"
            >
              ingest now
            </button>
          </form>
        </div>

        {items.map((n) => {
          const sev = severityFromScore(n.riskScore);
          return (
            <div key={n.id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-center gap-3">
                <RiskBadge severity={sev} />
                <span className="text-[11px] text-ink-dim">score {n.riskScore.toFixed(2)}</span>
                <span className="text-[11px] text-ink-dim">· {n.source}</span>
                <span className="text-[11px] text-ink-dim">· {shortRelTime(n.publishedAt)}</span>
                {n.region && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
                    <Globe2 className="h-3 w-3" /> {n.region}
                  </span>
                )}
                <a
                  href={n.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-xs text-ink-muted hover:text-eureka-200"
                >
                  open <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <h3 className="mt-2 font-display text-base text-ink">{n.title}</h3>
              <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">{n.summary}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {parseList<string>(n.topics).map((t) => (
                  <span
                    key={t}
                    className="rounded-md border border-line bg-bg-raised/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-muted"
                  >
                    {t}
                  </span>
                ))}
                {n.alerts.length > 0 && (
                  <span className="ml-auto text-[11px] text-eureka-300">
                    {n.alerts.length} alert{n.alerts.length === 1 ? "" : "s"} ·{" "}
                    {n.alerts.map((a) => a.supplier.name).join(", ")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
