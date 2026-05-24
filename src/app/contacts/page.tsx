import { db } from "@/lib/db";
import { Topbar } from "@/components/topbar";
import { Phone, Mail, ShieldCheck, Building2 } from "lucide-react";
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
      <Topbar
        title="Contacts"
        subtitle="People Eureka can dial when a supplier risk lands. Lower escalation = first."
      />
      <div className="space-y-3 p-8">
        <div className="flex items-center justify-between">
          <p className="text-xs text-ink-muted">
            {contacts.length} contact{contacts.length === 1 ? "" : "s"} on the call-tree
          </p>
          <ContactForm suppliers={suppliers} />
        </div>

        {contacts.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-ink-muted">
            No contacts yet — click <span className="text-eureka-200">New contact</span> to add one.
          </div>
        )}
        {contacts.map((c) => (
          <div
            key={c.id}
            className="glass flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full border border-eureka-500/30 bg-bg-card text-eureka-200">
                {c.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <div className="font-display text-base text-ink">{c.name}</div>
                <div className="text-xs text-ink-muted">{c.role}</div>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-eureka-300" />
                <span className="font-mono text-ink">{c.phone}</span>
              </span>
              {c.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> {c.email}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <ShieldCheck
                className={`h-3.5 w-3.5 ${c.receiveCalls ? "text-risk-low" : "text-ink-dim"}`}
              />
              <span className={c.receiveCalls ? "text-ink" : "text-ink-dim"}>
                {c.receiveCalls ? "voice ok" : "no voice"}
              </span>
              <span className="ml-2 rounded bg-bg-raised/60 px-1.5 py-0.5 text-[10px] text-ink-muted">
                L{c.escalation}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {c.suppliers.length === 0 && (
                <span className="text-[11px] text-risk-medium">no suppliers mapped</span>
              )}
              {c.suppliers.map((cs) => (
                <span
                  key={cs.supplierId}
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-bg-raised/40 px-2 py-0.5 text-[11px] text-ink-muted"
                >
                  <Building2 className="h-2.5 w-2.5" /> {cs.supplier.name}
                </span>
              ))}
            </div>

            <div className="ml-auto">
              <DeleteContactButton id={c.id} name={c.name} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
