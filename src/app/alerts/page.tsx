import { db } from "@/lib/db";
import { Topbar } from "@/components/topbar";
import { RiskBadge } from "@/components/risk-badge";
import { TestFireButton } from "@/components/test-fire-button";
import { parseList, shortRelTime } from "@/lib/utils";
import { Building2, Globe2, PhoneOutgoing, ExternalLink } from "lucide-react";
import { CallButton } from "./call-button";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const alerts = await db.alert.findMany({
    include: {
      news: true,
      supplier: { include: { contacts: { include: { contact: true } } } },
      calls: { include: { contact: true }, orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ status: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <div className="flex flex-col">
      <Topbar
        title="Alerts"
        subtitle="Risk events tied to your suppliers. Trigger a voice briefing for any alert."
      />
      <div className="space-y-4 p-8">
        <div className="flex items-center justify-end">
          <TestFireButton variant="ghost" />
        </div>
        {alerts.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-ink-muted">
            No alerts yet — pull signals from the dashboard to begin.
          </div>
        )}
        {alerts.map((a) => {
          const oncall = a.supplier.contacts
            .filter((c) => c.contact.receiveCalls)
            .sort((x, y) => x.contact.escalation - y.contact.escalation)[0]?.contact;
          return (
            <article id={a.id} key={a.id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <RiskBadge severity={a.severity} />
                  <span className="text-[11px] uppercase tracking-wider text-ink-dim">
                    {a.status}
                  </span>
                  <span className="text-[11px] text-ink-dim">· {shortRelTime(a.createdAt)}</span>
                </div>
                <a
                  href={a.news.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-eureka-200"
                >
                  source <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <h2 className="mt-3 font-display text-lg leading-snug text-ink">{a.news.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">
                {a.news.summary}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-line bg-bg-card/40 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-dim">supplier</div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-ink">
                    <Building2 className="h-3.5 w-3.5 text-eureka-300" />
                    {a.supplier.name}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                    <Globe2 className="h-3 w-3" />
                    {a.supplier.country} · {a.supplier.region}
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-bg-card/40 p-3 md:col-span-2">
                  <div className="text-[10px] uppercase tracking-wider text-ink-dim">
                    eureka recommendation
                  </div>
                  <p className="mt-1 text-sm text-ink">{a.recommendation}</p>
                  {a.decision && (
                    <p className="mt-2 text-xs text-eureka-200">
                      decision captured: <span className="text-ink">{a.decision}</span>
                      {a.decisionMaker && <span className="text-ink-muted"> · via {a.decisionMaker}</span>}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="text-xs text-ink-muted">
                  {oncall ? (
                    <>
                      on-call:{" "}
                      <span className="text-ink">{oncall.name}</span> · {oncall.role} ·{" "}
                      <span className="font-mono">{oncall.phone}</span>
                    </>
                  ) : (
                    <span className="text-risk-medium">no contact mapped to this supplier</span>
                  )}
                </div>
                <div className="ml-auto flex flex-wrap gap-1.5">
                  {parseList<string>(a.news.topics).map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-line bg-bg-raised/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-muted"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                {oncall && <CallButton alertId={a.id} contactName={oncall.name} />}
              </div>

              {a.calls.length > 0 && (
                <div className="mt-4 border-t border-line/60 pt-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-dim">
                    call history
                  </div>
                  <ul className="mt-2 space-y-1">
                    {a.calls.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 text-xs text-ink-muted">
                        <PhoneOutgoing className="h-3 w-3 text-eureka-300" />
                        <span className="text-ink">{c.contact.name}</span>
                        <span>· {c.status}</span>
                        {c.outcome && <span className="text-eureka-200">→ {c.outcome}</span>}
                        <span className="ml-auto">{shortRelTime(c.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
