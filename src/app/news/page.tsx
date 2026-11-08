import { db } from "@/lib/db";
import { Topbar } from "@/components/topbar";
import { parseList, severityFromScore, shortRelTime } from "@/lib/utils";
import { RiskBadge } from "@/components/risk-badge";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const items = await db.newsItem.findMany({
    orderBy: { publishedAt: "desc" },
    take: 100,
    include: { alerts: { include: { supplier: true } } },
  });

  return (
    <div className="flex flex-col">
      <Topbar title="Signals" subtitle="The news stream, scored for relevance against your suppliers." />
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-16">
        <div className="flex items-center justify-between border-b border-rule pb-3">
          <span className="text-xs text-ink-muted">{items.length} items</span>
          <form action="/api/news/ingest" method="post">
            <button type="submit" className="btn btn-secondary h-7 px-3 text-xs">
              Ingest now
            </button>
          </form>
        </div>
        <ul className="divide-y divide-rule">
          {items.map((n) => {
            const topics = parseList<string>(n.topics);
            return (
              <li key={n.id} className="py-5">
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                  <RiskBadge severity={severityFromScore(n.riskScore)} />
                  <span className="tabular-nums">Score {n.riskScore.toFixed(2)}</span>
                  <span>{n.source}</span>
                  <span>{shortRelTime(n.publishedAt)}</span>
                  {n.region && <span>{n.region}</span>}
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1 hover:text-ink"
                  >
                    Open <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </div>
                <h2 className="mt-1.5 text-base font-medium text-ink">{n.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{n.summary}</p>
                {(topics.length > 0 || n.alerts.length > 0) && (
                  <p className="mt-2 text-xs text-ink-muted">
                    {topics.join(", ")}
                    {n.alerts.length > 0 && (
                      <span className="text-ink-soft">
                        {topics.length > 0 && ". "}
                        Raised {n.alerts.length} alert{n.alerts.length === 1 ? "" : "s"} for{" "}
                        {n.alerts.map((a) => a.supplier.name).join(", ")}
                      </span>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
