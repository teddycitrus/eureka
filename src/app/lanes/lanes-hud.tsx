"use client";

import type { GlobeSnapshot } from "./types";

export type NetworkStats = ReturnType<typeof computeStats>;

export function LanesHud({ stats, loading }: { stats: NetworkStats; loading?: boolean }) {
  const share = stats.inTransitValue > 0 ? stats.exposedValue / stats.inTransitValue : 0;
  return (
    <div className="grid h-full grid-cols-2 gap-px bg-rule sm:grid-cols-4">
      <Figure
        label="Open risks"
        value={loading ? null : String(stats.openAlerts)}
        sub={loading ? null : severityLine(stats.bySeverity)}
      />
      <Figure
        label="Exposed in transit"
        value={loading ? null : money(stats.exposedValue)}
        sub={loading ? null : `of ${money(stats.inTransitValue)}, ${Math.round(share * 100)}%`}
        lead
      >
        {!loading && (
          <div className="mt-2 h-1 w-full rounded-full bg-raised" aria-hidden>
            <div
              className="h-1 rounded-full bg-risk-high"
              style={{ width: `${Math.round(share * 1000) / 10}%` }}
            />
          </div>
        )}
      </Figure>
      <Figure
        label="Lanes in motion"
        value={loading ? null : String(stats.activeShipments)}
        sub={loading ? null : laneLine(stats)}
      />
      <Figure
        label="Suppliers watched"
        value={loading ? null : String(stats.suppliers)}
        sub={loading ? null : `${stats.regions} region${stats.regions === 1 ? "" : "s"}`}
      />
    </div>
  );
}

function Figure({
  label,
  value,
  sub,
  lead,
  children,
}: {
  label: string;
  value: string | null;
  sub: string | null;
  lead?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col bg-surface px-4 py-3">
      <span className="text-xs text-ink-muted">{label}</span>
      {value === null ? (
        <span className="mt-1.5 h-6 w-12 rounded bg-raised" aria-label="Loading" />
      ) : (
        <span
          className={`mt-1 font-medium tabular-nums text-ink ${lead ? "text-[26px] leading-8" : "text-xl leading-8"}`}
        >
          {value}
        </span>
      )}
      {sub === null ? (
        <span className="mt-2 h-3 w-20 rounded bg-raised" aria-hidden />
      ) : (
        <span className="mt-0.5 truncate text-xs text-ink-soft">{sub}</span>
      )}
      {children}
    </div>
  );
}

function severityLine(by: Record<string, number>): string {
  const parts = ["critical", "high", "medium", "low"]
    .filter((k) => by[k] > 0)
    .map((k) => `${by[k]} ${k}`);
  return parts.length ? parts.join(", ") : "None open";
}

function laneLine(s: NetworkStats): string {
  const parts = [
    s.reroutedCount && `${s.reroutedCount} rerouted`,
    s.delayedCount && `${s.delayedCount} delayed`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "All on track";
}

export function money(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}

export function computeStats(s: GlobeSnapshot | null) {
  const empty = {
    openAlerts: 0,
    bySeverity: {} as Record<string, number>,
    activeShipments: 0,
    reroutedCount: 0,
    delayedCount: 0,
    inTransitValue: 0,
    exposedValue: 0,
    suppliers: 0,
    regions: 0,
  };
  if (!s) return empty;
  const bySeverity: Record<string, number> = {};
  for (const i of s.incidents) bySeverity[i.severity] = (bySeverity[i.severity] ?? 0) + 1;
  // A shipment is exposed when it carries an open alert or ships from a
  // supplier that has one.
  const openIds = new Set(s.incidents.map((i) => i.id));
  const alerted = new Set(s.markers.filter((m) => m.hasAlert).map((m) => m.name));
  const moving = s.shipments.filter((sh) => sh.status !== "arrived");
  const exposed = moving.filter(
    (sh) =>
      (sh.alertId != null && openIds.has(sh.alertId)) ||
      (sh.supplierName != null && alerted.has(sh.supplierName)),
  );
  const sum = (xs: typeof moving) => xs.reduce((t, sh) => t + (sh.valueUSD ?? 0), 0);
  return {
    openAlerts: s.incidents.length,
    bySeverity,
    activeShipments: moving.length,
    reroutedCount: moving.filter((sh) => sh.status === "rerouted").length,
    delayedCount: moving.filter((sh) => sh.status === "delayed").length,
    inTransitValue: sum(moving),
    exposedValue: sum(exposed),
    suppliers: s.markers.length,
    regions: new Set(s.markers.map((m) => m.region)).size,
  };
}
