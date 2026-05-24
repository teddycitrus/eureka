import { db } from "@/lib/db";
import { Topbar } from "@/components/topbar";
import { RiskBadge } from "@/components/risk-badge";
import { parseList } from "@/lib/utils";
import { Building2, Globe2, Layers, UserCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const suppliers = await db.supplier.findMany({
    include: {
      contacts: { include: { contact: true } },
      alerts: { where: { status: { not: "dismissed" } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col">
      <Topbar
        title="Suppliers"
        subtitle="Your monitored supply graph. Eureka scores every signal against this list."
      />
      <div className="grid grid-cols-1 gap-4 p-8 md:grid-cols-2 xl:grid-cols-3">
        {suppliers.map((s) => (
          <div key={s.id} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <Building2 className="h-3.5 w-3.5 text-eureka-300" />
                  tier {s.tier}
                </div>
                <h3 className="mt-1 font-display text-lg text-ink">{s.name}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                  <Globe2 className="h-3 w-3" /> {s.country} · {s.region}
                </div>
              </div>
              <RiskBadge severity={s.riskLevel} />
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {parseList<string>(s.categories).map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-bg-raised/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-muted"
                >
                  <Layers className="h-2.5 w-2.5" /> {c}
                </span>
              ))}
            </div>

            {s.notes && <p className="mt-4 text-xs leading-relaxed text-ink-muted">{s.notes}</p>}

            <div className="mt-5 border-t border-line/60 pt-3">
              <div className="text-[10px] uppercase tracking-wider text-ink-dim">on-call tree</div>
              <ul className="mt-2 space-y-1.5">
                {s.contacts.length === 0 && (
                  <li className="text-xs text-risk-medium">no contacts mapped</li>
                )}
                {s.contacts
                  .slice()
                  .sort((a, b) => a.contact.escalation - b.contact.escalation)
                  .map((cs) => (
                    <li key={cs.contactId} className="flex items-center gap-2 text-xs text-ink">
                      <UserCircle2 className="h-3.5 w-3.5 text-eureka-300" />
                      <span>{cs.contact.name}</span>
                      <span className="text-ink-dim">· {cs.contact.role}</span>
                      <span className="ml-auto rounded bg-bg-raised/60 px-1.5 py-0.5 text-[10px] text-ink-muted">
                        L{cs.contact.escalation}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px] text-ink-dim">
              <span>{s.alerts.length} live alert{s.alerts.length === 1 ? "" : "s"}</span>
              <span>id · {s.id.slice(0, 6)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
