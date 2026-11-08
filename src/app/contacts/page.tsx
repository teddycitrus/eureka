import { db } from "@/lib/db";
import { Topbar } from "@/components/topbar";
import { ContactForm } from "./contact-form";
import { DeleteContactButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const [contacts, suppliers] = await Promise.all([
    db.contact.findMany({
      include: { suppliers: { include: { supplier: true } } },
      orderBy: [{ escalation: "asc" }, { name: "asc" }],
    }),
    db.supplier.findMany({
      select: { id: true, name: true, country: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col">
      <Topbar title="Contacts" subtitle="People Eureka calls when a supplier risk lands, lowest level first." />
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-16">
        <div className="flex items-center justify-between border-b border-rule pb-3">
          <span className="text-xs text-ink-muted">
            {contacts.length} {contacts.length === 1 ? "person" : "people"} on the call tree
          </span>
          <ContactForm suppliers={suppliers} />
        </div>
        {contacts.length === 0 && (
          <p className="py-6 text-sm text-ink-soft">No one is on the call tree yet. Add a person to start.</p>
        )}
        <ul className="divide-y divide-rule">
          {contacts.map((c) => (
            <li key={c.id} className="grid items-start gap-4 py-4 md:grid-cols-[1fr_1fr_1fr_auto]">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-raised text-xs font-semibold text-ink"
                  aria-hidden
                >
                  {c.name
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div>
                  <div className="text-sm font-medium text-ink">{c.name}</div>
                  <div className="text-xs text-ink-soft">
                    {c.role}, level {c.escalation}
                  </div>
                </div>
              </div>
              <div className="text-sm">
                <div className="tabular-nums text-ink">{c.phone}</div>
                {c.email && <div className="text-ink-soft">{c.email}</div>}
                <div className={c.receiveCalls ? "text-xs text-ink-muted" : "text-xs text-warning"}>
                  {c.receiveCalls ? "Eureka may call" : "Not dialled"}
                </div>
              </div>
              <div className="text-sm text-ink-soft">
                {c.suppliers.length === 0 ? (
                  <span className="text-warning">No suppliers mapped</span>
                ) : (
                  c.suppliers.map((cs) => cs.supplier.name).join(", ")
                )}
              </div>
              <DeleteContactButton id={c.id} name={c.name} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
