"use client";

import { RiskBadge } from "@/components/risk-badge";
import { bySeverity, cn, severityRank, shortRelTime } from "@/lib/utils";
import { SEVERITY_COLOR } from "./colors";
import type { GlobeIncident, GlobeMarker, ShipmentSummary } from "./types";

export function DisruptionRail({
  incidents,
  markers,
  shipments,
  loading,
  selectedId,
  onSelect,
}: {
  incidents: GlobeIncident[];
  markers: GlobeMarker[];
  shipments: ShipmentSummary[];
  loading?: boolean;
  selectedId: string | null;
  onSelect: (id: string | null, lat: number | null, lng: number | null) => void;
}) {
  const supplier = new Map(markers.map((m) => [m.id, m]));
  const rows = [...incidents].sort(bySeverity);
  const lanes = new Map<string, number>();
  for (const sh of shipments) {
    if (sh.supplierName && sh.status !== "arrived") {
      lanes.set(sh.supplierName, (lanes.get(sh.supplierName) ?? 0) + 1);
    }
  }
  const watched = [...markers].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  if (loading) {
    return (
      <div className="divide-y divide-rule" aria-label="Loading disruptions">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2 px-4 py-4">
            <div className="h-3 w-16 rounded bg-raised" />
            <div className="h-4 w-full rounded bg-raised" />
            <div className="h-3 w-2/3 rounded bg-raised" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-ink">No disruptions above the watch threshold.</p>
      ) : (
        <ul className="divide-y divide-rule border-b border-rule">
          {rows.map((i) => {
            const s = supplier.get(i.supplierId);
            const active = selectedId === i.id;
            return (
              <li key={i.id} className="arrive">
                <button
                  type="button"
                  onClick={() => onSelect(i.id, i.lat, i.lng)}
                  aria-pressed={active}
                  className={cn(
                    "relative block w-full px-4 py-3.5 text-left transition-colors",
                    active ? "bg-raised" : "hover:bg-raised/60",
                  )}
                >
                  {active && <span className="absolute inset-y-0 left-0 w-px bg-accent" aria-hidden />}
                  <div className="flex items-center justify-between gap-2">
                    <RiskBadge severity={i.severity} />
                    <span className="text-xs text-ink-muted">{shortRelTime(i.createdAt)}</span>
                  </div>
                  <h3 className="mt-1.5 line-clamp-2 text-base font-medium text-ink">{i.headline}</h3>
                  {s && (
                    <p className="mt-1 truncate text-xs text-ink-soft">
                      {s.name}, {s.country}
                    </p>
                  )}
                  <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{i.recommendation}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-4 pb-2 pt-5">
        <h3 className="text-xs text-ink-muted">Suppliers watched</h3>
      </div>
      <ul>
        {watched.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onSelect(m.alertId, m.lat, m.lng)}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-raised/60"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: SEVERITY_COLOR[m.severity] ?? SEVERITY_COLOR.low }}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{m.name}</span>
                <span className="block truncate text-xs text-ink-muted">
                  {m.country}, {m.categories.slice(0, 2).join(", ")}
                </span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-ink-soft">
                {lanes.get(m.name) ?? 0} lane{(lanes.get(m.name) ?? 0) === 1 ? "" : "s"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
