"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { ActivityRail } from "./activity-rail";
import type { ActivityEntry } from "./lanes-view";
import { CallButton } from "@/app/alerts/call-button";
import { ContactForm } from "@/app/contacts/contact-form";
import { DeleteContactButton } from "@/app/contacts/delete-button";
import { RiskBadge } from "@/components/risk-badge";
import { bySeverity, cn, parseList, shortRelTime } from "@/lib/utils";

type Tab = "alerts" | "calls" | "contacts" | "live";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "alerts", label: "Risks" },
  { id: "calls", label: "Calls" },
  { id: "contacts", label: "Call tree" },
  { id: "live", label: "Log" },
];

export function RightPanel({
  activity,
  openRisks,
  selectedAlertId,
  onRefreshNeeded,
}: {
  activity: ActivityEntry[];
  openRisks: number;
  selectedAlertId: string | null;
  onRefreshNeeded: () => void;
}) {
  const [tab, setTab] = useState<Tab>("alerts");
  const tick = activity.length;

  return (
    <div className="flex h-full flex-col">
      <div role="tablist" className="flex shrink-0 items-end gap-5 border-b border-rule px-4">
        {TABS.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={cn(
                "relative -mb-px py-2.5 text-sm transition-colors",
                active ? "text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {label}
              {id === "alerts" && openRisks > 0 && (
                <span className="ml-1.5 tabular-nums text-ink-soft">{openRisks}</span>
              )}
              <span
                className={cn("absolute inset-x-0 bottom-0 h-px", active ? "bg-accent" : "bg-transparent")}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1">
        {tab === "live" && <ActivityRail entries={activity} />}
        {tab === "alerts" && (
          <AlertsTab tick={tick} selectedId={selectedAlertId} onChanged={onRefreshNeeded} />
        )}
        {tab === "calls" && <CallsTab tick={tick} />}
        {tab === "contacts" && <ContactsTab tick={tick} />}
      </div>
    </div>
  );
}

// ── Alerts ──────────────────────────────────────────────────────
type AlertRow = {
  id: string;
  severity: string;
  status: string;
  recommendation: string;
  createdAt: string;
  news: { title: string; topics: string; url: string; source?: string };
  supplier: {
    name: string;
    region: string;
    contacts: Array<{
      contact: { name: string; role: string; receiveCalls: boolean; escalation: number };
    }>;
  };
};

function AlertsTab({
  tick,
  selectedId,
  onChanged,
}: {
  tick: number;
  selectedId: string | null;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<AlertRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/alerts", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: AlertRow[]) => {
        setRows(d);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [tick]);

  useEffect(() => {
    if (selectedId) document.getElementById(`risk-${selectedId}`)?.scrollIntoView({ block: "nearest" });
  }, [selectedId, rows]);

  async function patch(id: string, status: string) {
    setBusy(id);
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setBusy(null);
    onChanged();
    setRows((r) => r?.filter((a) => a.id !== id) ?? null);
  }

  if (failed && !rows) return <PanelNote>Could not load risks. They reload with the next event.</PanelNote>;
  if (rows === null) return <RowsLoading />;
  if (rows.length === 0)
    return <PanelNote>No open risks. Nothing needs a call right now.</PanelNote>;

  const sorted = [...rows].sort(bySeverity);

  return (
    <ul className="h-full divide-y divide-rule overflow-y-auto">
      {sorted.map((a) => {
        const oncall = a.supplier.contacts
          .filter((c) => c.contact.receiveCalls)
          .sort((x, y) => x.contact.escalation - y.contact.escalation)[0]?.contact;
        const topics = parseList<string>(a.news.topics).slice(0, 4);
        const active = a.id === selectedId;
        return (
          <li
            key={a.id}
            id={`risk-${a.id}`}
            className={cn("relative px-4 py-3.5", active && "bg-raised")}
          >
            {active && <span className="absolute inset-y-0 left-0 w-px bg-accent" aria-hidden />}
            <div className="flex items-center gap-3">
              <RiskBadge severity={a.severity} />
              <span className="text-xs text-ink-muted">
                {a.status === "pending" ? "Waiting on a decision" : capital(a.status)}, {shortRelTime(a.createdAt)}
              </span>
              <a
                href={a.news.url}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
              >
                Source <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </div>
            <h3 className="mt-1.5 line-clamp-2 text-base font-medium text-ink">{a.news.title}</h3>
            <p className="mt-1 text-xs text-ink-soft">
              {a.supplier.name}
              {topics.length > 0 && <span className="text-ink-muted">, {topics.join(", ")}</span>}
            </p>
            <p className="mt-2 text-sm text-ink-soft">{a.recommendation}</p>
            <p className="mt-2 text-xs text-ink-muted">
              {oncall ? (
                <>
                  On call: <span className="text-ink-soft">{oncall.name}</span>, {oncall.role}, level{" "}
                  {oncall.escalation}
                </>
              ) : (
                <span className="text-warning">No one on the call tree for this supplier</span>
              )}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {oncall && <CallButton alertId={a.id} contactName={oncall.name} />}
              <span className="ml-auto flex">
                <button
                  type="button"
                  className="btn btn-text h-7 text-xs"
                  onClick={() => patch(a.id, "resolved")}
                  disabled={busy === a.id}
                >
                  Resolve
                </button>
                <button
                  type="button"
                  className="btn btn-text h-7 text-xs"
                  onClick={() => patch(a.id, "dismissed")}
                  disabled={busy === a.id}
                >
                  Dismiss
                </button>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Calls ───────────────────────────────────────────────────────
type CallRow = {
  id: string;
  status: string;
  outcome: string | null;
  transcript: string | null;
  durationSec: number | null;
  createdAt: string;
  contact: { name: string; role: string };
  alert: { supplier: { name: string }; news: { title: string } };
};

const CALL_TONE: Record<string, string> = {
  completed: "text-positive",
  failed: "text-negative",
};

function CallsTab({ tick }: { tick: number }) {
  const [rows, setRows] = useState<CallRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/calls", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: CallRow[]) => {
        setRows(d);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [tick]);

  if (failed && !rows) return <PanelNote>Could not load calls. They reload with the next event.</PanelNote>;
  if (rows === null) return <RowsLoading />;
  if (rows.length === 0)
    return (
      <PanelNote>
        No calls yet. Use Call on a risk to brief the person at the top of its call tree.
      </PanelNote>
    );

  return (
    <ul className="h-full divide-y divide-rule overflow-y-auto">
      {rows.map((c) => {
        const open = openId === c.id;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : c.id)}
              aria-expanded={open}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-raised/60"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-ink">
                  {c.contact.name}
                  <span className="text-ink-muted">, {c.alert.supplier.name}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs">
                  <span className={CALL_TONE[c.status] ?? "text-accent"}>{capital(c.status)}</span>
                  {c.outcome && <span className="text-ink">Decided: {c.outcome}</span>}
                  {typeof c.durationSec === "number" && (
                    <span className="tabular-nums text-ink-muted">{duration(c.durationSec)}</span>
                  )}
                </div>
              </div>
              <span className="shrink-0 text-xs text-ink-muted">{shortRelTime(c.createdAt)}</span>
            </button>
            {open && (
              <div className="bg-raised/50 px-4 py-3">
                <h4 className="text-xs text-ink-muted">Briefing</h4>
                <p className="mt-0.5 text-sm text-ink">{c.alert.news.title}</p>
                <h4 className="mt-3 text-xs text-ink-muted">Transcript</h4>
                <p className="mt-0.5 max-h-48 overflow-auto whitespace-pre-wrap text-sm text-ink-soft">
                  {c.transcript ?? "No transcript was recorded for this call."}
                </p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ── Contacts ────────────────────────────────────────────────────
type ContactRow = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string | null;
  receiveCalls: boolean;
  escalation: number;
  suppliers: Array<{ supplier: { id: string; name: string } }>;
};
type SupplierLite = { id: string; name: string; country: string };

function ContactsTab({ tick }: { tick: number }) {
  const [contacts, setContacts] = useState<ContactRow[] | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/contacts", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/suppliers", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([cs, ss]: [ContactRow[], SupplierLite[]]) => {
        setContacts(cs);
        setSuppliers(ss.map((s) => ({ id: s.id, name: s.name, country: s.country })));
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [tick]);

  const sorted = useMemo(
    () => (contacts ? [...contacts].sort((a, b) => a.escalation - b.escalation) : null),
    [contacts],
  );

  if (failed && !sorted)
    return <PanelNote>Could not load the call tree. It reloads with the next event.</PanelNote>;
  if (sorted === null) return <RowsLoading />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-rule px-4 py-2.5">
        <span className="text-xs text-ink-muted">
          {sorted.length} {sorted.length === 1 ? "person" : "people"}, called in escalation order
        </span>
        <ContactForm suppliers={suppliers} />
      </div>
      {sorted.length === 0 ? (
        <PanelNote>No one is on the call tree. Add a person so Eureka has someone to brief.</PanelNote>
      ) : (
        <ul className="flex-1 divide-y divide-rule overflow-y-auto">
          {sorted.map((c) => (
            <li key={c.id} className="flex items-start gap-3 px-4 py-3">
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-raised text-xs font-semibold text-ink"
                aria-hidden
              >
                {c.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-medium text-ink">{c.name}</span>
                  <span className="shrink-0 text-xs text-ink-muted">Level {c.escalation}</span>
                  {!c.receiveCalls && <span className="shrink-0 text-xs text-warning">Not dialled</span>}
                </div>
                <div className="text-xs text-ink-soft">{c.role}</div>
                <div className="mt-1 truncate text-xs tabular-nums text-ink-muted">
                  {c.phone}
                  {c.email && <>, {c.email}</>}
                </div>
                {c.suppliers.length > 0 && (
                  <div className="mt-1 truncate text-xs text-ink-soft">
                    {c.suppliers.map((cs) => cs.supplier.name).join(", ")}
                  </div>
                )}
              </div>
              <DeleteContactButton id={c.id} name={c.name} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PanelNote({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-4 text-sm text-ink-soft">{children}</p>;
}

function RowsLoading() {
  return (
    <div className="divide-y divide-rule" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2 px-4 py-4">
          <div className="h-3 w-24 rounded bg-raised" />
          <div className="h-4 w-full rounded bg-raised" />
        </div>
      ))}
    </div>
  );
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function duration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} m ${s} s` : `${s} s`;
}
