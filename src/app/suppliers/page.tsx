import { db } from "@/lib/db";
import { Topbar } from "@/components/topbar";
import { RiskBadge } from "@/components/risk-badge";
import { parseList } from "@/lib/utils";

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
      <Topbar title="Suppliers" subtitle="The supply graph Eureka scores every signal against." />
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-16">
        <ul className="divide-y divide-rule border-t border-rule">
          {suppliers.map((s) => {
            const tree = s.contacts.slice().sort((a, b) => a.contact.escalation - b.contact.escalation);
            return (
              <li key={s.id} className="grid gap-4 py-5 md:grid-cols-[1fr_1fr_120px]">
                <div className="min-w-0">
                  <h2 className="text-base font-medium text-ink">{s.name}</h2>
                  <p className="text-xs text-ink-soft">
                    Tier {s.tier}, {s.country}, {s.region}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">{parseList<string>(s.categories).join(", ")}</p>
                  {s.notes && <p className="mt-2 text-sm text-ink-soft">{s.notes}</p>}
                </div>
                <div>
                  <h3 className="text-xs text-ink-muted">Call tree</h3>
                  {tree.length === 0 ? (
                    <p className="text-sm text-warning">No one mapped</p>
                  ) : (
                    <ul className="mt-0.5 space-y-0.5 text-sm">
                      {tree.map((cs) => (
                        <li key={cs.contactId} className="flex gap-2">
                          <span className="text-ink">{cs.contact.name}</span>
                          <span className="text-ink-soft">{cs.contact.role}</span>
                          <span className="ml-auto text-xs text-ink-muted">Level {cs.contact.escalation}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="md:text-right">
                  <RiskBadge severity={s.riskLevel} />
                  <p className="mt-1 text-xs text-ink-muted">
                    {s.alerts.length} live alert{s.alerts.length === 1 ? "" : "s"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
