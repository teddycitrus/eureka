import { db } from "@/lib/db";
import { Topbar } from "@/components/topbar";
import { shortRelTime } from "@/lib/utils";
import { Phone, Building2, UserCircle2, Clock, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

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
      <Topbar
        title="Voice ops"
        subtitle="Outbound briefings placed by Eureka, with transcripts and decisions."
      />
      <div className="space-y-3 p-8">
        {calls.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-ink-muted">
            No voice operations yet. Eureka will log every dispatch here.
          </div>
        )}
        {calls.map((c) => (
          <details
            key={c.id}
            className="glass group rounded-2xl p-5 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-5 gap-y-2">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                  c.status === "completed"
                    ? "text-risk-low"
                    : c.status === "failed"
                      ? "text-risk-critical"
                      : "text-accent-cyan"
                }`}
              >
                <Phone className="h-3.5 w-3.5" />
                {c.status}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-ink">
                <UserCircle2 className="h-3.5 w-3.5 text-eureka-300" />
                {c.contact.name}
                <span className="text-ink-muted">· {c.contact.role}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                <Building2 className="h-3 w-3" />
                {c.alert.supplier.name}
              </span>
              {c.outcome && (
                <span className="rounded-full bg-eureka-500/15 px-2 py-0.5 text-[11px] uppercase tracking-wider text-eureka-200 ring-1 ring-eureka-500/30">
                  {c.outcome}
                </span>
              )}
              {typeof c.durationSec === "number" && (
                <span className="inline-flex items-center gap-1 text-[11px] text-ink-dim">
                  <Clock className="h-3 w-3" /> {c.durationSec}s
                </span>
              )}
              <span className="ml-auto text-[11px] text-ink-dim">
                {shortRelTime(c.createdAt)}
              </span>
            </summary>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-line bg-bg-card/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-ink-dim">briefing</div>
                <p className="mt-1 text-sm text-ink">{c.alert.news.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {c.alert.recommendation}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-bg-card/40 p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-dim">
                  <FileText className="h-3 w-3" /> transcript
                </div>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink-muted">
                  {c.transcript ?? "— no transcript yet —"}
                </pre>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
