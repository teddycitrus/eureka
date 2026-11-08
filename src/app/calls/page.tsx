import { db } from "@/lib/db";
import { Topbar } from "@/components/topbar";
import { shortRelTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = { completed: "text-positive", failed: "text-negative" };

export default async function CallsPage() {
  const calls = await db.call.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      contact: true,
      alert: { include: { supplier: true, news: true } },
    },
  });

  return (
    <div className="flex flex-col">
      <Topbar title="Calls" subtitle="Briefings Eureka placed, with what was said and what was decided." />
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-16">
        {calls.length === 0 && (
          <p className="border-t border-rule py-6 text-sm text-ink-soft">
            No calls yet. Every briefing Eureka places is logged here.
          </p>
        )}
        <ul className="divide-y divide-rule border-t border-rule">
          {calls.map((c) => (
            <li key={c.id}>
              <details className="group py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="text-sm font-medium text-ink">{c.contact.name}</span>
                  <span className="text-xs text-ink-soft">
                    {c.contact.role}, {c.alert.supplier.name}
                  </span>
                  <span className={`text-xs ${TONE[c.status] ?? "text-accent"}`}>{c.status}</span>
                  {c.outcome && <span className="text-xs text-ink">Decided: {c.outcome}</span>}
                  {typeof c.durationSec === "number" && (
                    <span className="text-xs tabular-nums text-ink-muted">{c.durationSec} s</span>
                  )}
                  <span className="ml-auto text-xs text-ink-muted">{shortRelTime(c.createdAt)}</span>
                </summary>
                <div className="mt-3 grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="text-xs text-ink-muted">Briefing</h3>
                    <p className="mt-0.5 text-sm text-ink">{c.alert.news.title}</p>
                    <p className="mt-1 text-sm text-ink-soft">{c.alert.recommendation}</p>
                  </div>
                  <div>
                    <h3 className="text-xs text-ink-muted">Transcript</h3>
                    <p className="mt-0.5 max-h-64 overflow-auto whitespace-pre-wrap text-sm text-ink-soft">
                      {c.transcript ?? "No transcript yet."}
                    </p>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
