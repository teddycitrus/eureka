"use client";

import { shortRelTime } from "@/lib/utils";
import type { ActivityEntry } from "./lanes-view";

// Only meaningful actions land here — outbound dial events are excluded.
const KIND_META: Record<string, { label: (p: Record<string, unknown>) => string}> = {
  "alert.created": {
    label: (p) => `Risk surfaced${p.severity ? `, ${String(p.severity)}` : ""}`,
  },
  "alert.updated": {
    label: (p) => statusLabel(p),
  },
  "call.outcome": {
    label: (p) => `Decision recorded${p.outcome ? `: ${String(p.outcome)}` : ""}`,
  },
  "shipment.created": {
    label: () => "Lane added",
  },
  "shipment.updated": {
    label: (p) =>
      String(p.status) === "rerouted" ? "Lane rerouted" : `Lane now ${String(p.status ?? "updated")}`,
  },
};

const HIDDEN_KINDS = new Set(["call.started"]);

function statusLabel(p: Record<string, unknown>): string {
  const status = String(p.status ?? "");
  if (status === "calling") return "Voice briefing dispatched";
  if (status === "escalated") return "Alert escalated";
  if (status === "resolved") return "Alert resolved";
  if (status === "dismissed") return "Alert dismissed";
  return `Alert ${status}`;
}

export function ActivityRail({ entries }: { entries: ActivityEntry[] }) {
  const visible = entries.filter((e) => !HIDDEN_KINDS.has(e.kind));

  if (visible.length === 0) {
    return (
      <div className="px-4 py-4">
        <p className="text-sm text-ink">Nothing has happened since you opened this page.</p>
        <p className="mt-1 text-sm text-ink-soft">
          New risks, reroutes, calls and decisions appear here as they happen.
        </p>
      </div>
    );
  }

  return (
    <ol className="h-full divide-y divide-rule overflow-y-auto">
      {visible.map((e, idx) => {
        const meta = KIND_META[e.kind] ?? { label: () => e.kind };
        const ref = tail(e.payload);
        return (
          <li key={`${e.ts}-${idx}`} className="arrive flex items-start gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm text-ink">{meta.label(e.payload)}</div>
              {ref && <div className="text-xs text-ink-muted">{ref}</div>}
            </div>
            <span className="shrink-0 text-xs text-ink-muted">{shortRelTime(new Date(e.ts))}</span>
          </li>
        );
      })}
    </ol>
  );
}

function tail(p: Record<string, unknown>): string | null {
  if (typeof p.alertId === "string") return `Alert ${String(p.alertId).slice(-6)}`;
  if (typeof p.shipmentId === "string") return `Shipment ${String(p.shipmentId).slice(-6)}`;
  if (typeof p.callId === "string") return `Call ${String(p.callId).slice(-6)}`;
  return null;
}
