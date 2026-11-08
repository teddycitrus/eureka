import { db } from "@/lib/db";
import { Topbar } from "@/components/topbar";
import { RiskBadge } from "@/components/risk-badge";
import { TestFireButton } from "@/components/test-fire-button";
import { bySeverity, parseList, shortRelTime } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
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
  // Severity is stored as a word, so the database orders it alphabetically.
  alerts.sort((a, b) => (a.status === b.status ? bySeverity(a, b) : a.status < b.status ? -1 : 1));

  return (
    <div className="flex flex-col">
      <Topbar title="Alerts" subtitle="Risk events tied to your suppliers, with the call that each one led to." />
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-16">
        <div className="flex items-center justify-between border-b border-rule pb-3">
          <span className="text-xs text-ink-muted">
            {alerts.length} alert{alerts.length === 1 ? "" : "s"}
          </span>
          <TestFireButton variant="ghost" />
        </div>
        {alerts.length === 0 && (
          <p className="py-6 text-sm text-ink-soft">No alerts yet. New signals that match a supplier appear here.</p>
        )}
        <ul className="divide-y divide-rule">
          {alerts.map((a) => {
            const oncall = a.supplier.contacts
              .filter((c) => c.contact.receiveCalls)
              .sort((x, y) => x.contact.escalation - y.contact.escalation)[0]?.contact;
            const topics = parseList<string>(a.news.topics);
            return (
              <li id={a.id} key={a.id} className="grid gap-6 py-6 md:grid-cols-[1fr_320px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <RiskBadge severity={a.severity} />
                    <span className="text-xs text-ink-muted">
                      {a.status.charAt(0).toUpperCase() + a.status.slice(1)}, {shortRelTime(a.createdAt)}
                    </span>
                    <a
                      href={a.news.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
                    >
                      {a.news.source ?? "Source"} <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-ink">{a.news.title}</h2>
                  <p className="mt-1 text-sm text-ink-soft">{a.news.summary}</p>
                  <h3 className="mt-4 text-xs text-ink-muted">Eureka recommends</h3>
                  <p className="mt-0.5 text-sm text-ink">{a.recommendation}</p>
                  {a.decision && (
                    <p className="mt-2 text-sm text-ink">
                      Decided: {a.decision}
                      {a.decisionMaker && <span className="text-ink-muted">, by {a.decisionMaker}</span>}
                    </p>
                  )}
                </div>
                <div className="space-y-4 text-sm">
                  <div>
                    <h3 className="text-xs text-ink-muted">Supplier</h3>
                    <p className="text-ink">{a.supplier.name}</p>
                    <p className="text-xs text-ink-soft">
                      {a.supplier.country}, {a.supplier.region}
                      {topics.length > 0 && <span className="text-ink-muted">. {topics.join(", ")}</span>}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs text-ink-muted">On call</h3>
                    {oncall ? (
                      <>
                        <p className="text-ink">{oncall.name}</p>
                        <p className="text-xs tabular-nums text-ink-soft">
                          {oncall.role}, {oncall.phone}
                        </p>
                        <div className="mt-2">
                          <CallButton alertId={a.id} contactName={oncall.name} />
                        </div>
                      </>
                    ) : (
                      <p className="text-warning">No one is mapped to this supplier</p>
                    )}
                  </div>
                  {a.calls.length > 0 && (
                    <div>
                      <h3 className="text-xs text-ink-muted">Calls</h3>
                      <ul className="mt-1 space-y-1">
                        {a.calls.map((c) => (
                          <li key={c.id} className="flex gap-2 text-xs">
                            <span className="text-ink">{c.contact.name}</span>
                            <span className="text-ink-soft">
                              {c.status}
                              {c.outcome && `, ${c.outcome}`}
                            </span>
                            <span className="ml-auto text-ink-muted">{shortRelTime(c.createdAt)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
