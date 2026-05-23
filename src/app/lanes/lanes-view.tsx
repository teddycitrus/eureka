"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { IrisMark } from "@/components/iris-mark";
import { TestFireButton } from "@/components/test-fire-button";
import { DemoCallCard } from "@/components/demo-call-card";
import { Window } from "@/components/window";
import { FourKitesLogin, type ConnectionStatus } from "@/components/fourkites-login";
import { DisruptionRail } from "./disruption-rail";
import { RightPanel } from "./right-panel";
import { LanesHud } from "./lanes-hud";
import type { GlobeSnapshot } from "./types";

const GlobeView = dynamic(() => import("./globe-view").then((m) => m.GlobeView), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center">
      <span className="label text-ink-dim">awakening the globe</span>
    </div>
  ),
});

type WinId = "wire" | "station" | "instruments";

export function LanesView() {
  const [snap, setSnap] = useState<GlobeSnapshot | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [highlightedShipmentId, setHighlightedShipmentId] = useState<string | null>(null);
  const [fkStatus, setFkStatus] = useState<ConnectionStatus>("unknown");
  const [fkAccount, setFkAccount] = useState<string | null>(null);
  const liveSince = useRef(Date.now());

  // Window manager state — z-index per window, bumped on focus
  const [zStack, setZStack] = useState<Record<WinId, number>>({
    wire: 10,
    station: 11,
    instruments: 9,
  });
  const topZRef = useRef(11);
  const focusWin = useCallback((id: WinId) => {
    topZRef.current += 1;
    const next = topZRef.current;
    setZStack((s) => (s[id] === next ? s : { ...s, [id]: next }));
  }, []);

  // Measure the bounds container so Windows can place themselves correctly on first paint.
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!stageRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setStage({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/globe", { cache: "no-store" });
      if (!res.ok) return;
      setSnap((await res.json()) as GlobeSnapshot);
    } catch (err) {
      console.warn("globe snapshot fetch failed", err);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    const onAny = (kind: string) => (e: MessageEvent) => {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(e.data);
      } catch {
        /* noop */
      }
      setActivity((prev) =>
        [{ ts: Date.now(), kind, payload } as ActivityEntry, ...prev].slice(0, 80),
      );
      if (kind === "alert.created" && typeof payload.alertId === "string") {
        setSelectedAlertId(payload.alertId);
      }
      if (
        kind === "shipment.updated" &&
        typeof payload.shipmentId === "string" &&
        payload.status === "rerouted"
      ) {
        const id = payload.shipmentId;
        setHighlightedShipmentId(id);
        window.setTimeout(() => {
          setHighlightedShipmentId((cur) => (cur === id ? null : cur));
        }, 12_000);
      }
      if (
        kind === "alert.created" ||
        kind === "alert.updated" ||
        kind === "shipment.created" ||
        kind === "shipment.updated" ||
        kind === "call.outcome"
      ) {
        refresh();
      }
    };
    const events = [
      "alert.created",
      "alert.updated",
      "shipment.created",
      "shipment.updated",
      "call.started",
      "call.outcome",
    ];
    for (const k of events) es.addEventListener(k, onAny(k));
    es.addEventListener("hello", () => (liveSince.current = Date.now()));
    return () => es.close();
  }, [refresh]);

  const today = useMemo(() => formatDate(new Date()), []);
  const ready = stage.w > 320 && stage.h > 240;

  // Initial layout matches the pre-windows CSS grid:
  // [300 wire] gap [center] gap [400 station]   with HUD docked at the
  // bottom of the center column.
  const layout = useMemo(() => {
    if (!ready) return null;
    const margin = 12;
    const gap = 12;
    const wireW = Math.min(300, Math.max(240, stage.w * 0.22));
    const stationW = Math.min(400, Math.max(320, stage.w * 0.28));
    const hudH = 110;
    const sideH = Math.max(220, stage.h - margin * 2 - hudH - gap);
    const centerX = margin + wireW + gap;
    const centerW = Math.max(360, stage.w - margin * 2 - wireW - stationW - gap * 2);
    return {
      wire: {
        pos: { x: margin, y: margin },
        size: { width: wireW, height: sideH },
      },
      station: {
        pos: { x: stage.w - stationW - margin, y: margin },
        size: { width: stationW, height: sideH },
      },
      instruments: {
        pos: { x: centerX, y: stage.h - hudH - margin },
        size: { width: centerW, height: hudH },
      },
    };
  }, [ready, stage]);

  return (
    <div className="flex h-screen flex-col">
      {/* ── Editorial masthead ─────────────────────────────────── */}
      <header
        data-reveal="0"
        className="flex shrink-0 items-center justify-between border-b border-line/70 bg-bg-raised/40 px-6 py-3 backdrop-blur"
      >
        <div className="flex items-center gap-4">
          <IrisMark className="h-7 w-7" animate={false} />
          <div className="flex flex-col leading-none">
            <span className="font-display text-[22px] font-medium tracking-tight text-ink">
              iris<span className="text-amber">.</span>
            </span>
            <span className="mt-1 font-mono text-[10px] uppercase tracking-chart text-ink-dim">
              no. 01 · {today} · supply ops
            </span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <Counter label="suppliers" value={snap?.markers.length ?? 0} />
          <span className="h-3 w-px bg-line" />
          <Counter label="lanes" value={snap?.shipments.length ?? 0} />
          <span className="h-3 w-px bg-line" />
          <Counter
            label="open risk"
            value={snap?.incidents.length ?? 0}
            valueClass={(snap?.incidents.length ?? 0) > 0 ? "text-amber" : "text-ink"}
          />
          <span className="h-3 w-px bg-line" />
          <FkPill status={fkStatus} account={fkAccount} />
          <span className="inline-flex items-center gap-2">
            <span className="brass-dot relative h-1.5 w-1.5 rounded-full bg-amber" />
            <span className="font-mono text-[10px] uppercase tracking-chart text-ink-warm">
              live
            </span>
          </span>
        </div>
      </header>

      <FourKitesLogin
        onStatus={(s, account) => {
          setFkStatus(s);
          if (account) setFkAccount(account);
        }}
      />

      {/* ── Stage: globe behind, windows on top ────────────────── */}
      <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden">
        {/* Globe fills the stage */}
        <div className="absolute inset-0">
          <GlobeView
            snapshot={snap}
            focus={focus}
            selectedAlertId={selectedAlertId}
            highlightedShipmentId={highlightedShipmentId}
          />
          {/* fixed chart annotations */}
          <div className="pointer-events-none absolute left-5 top-4">
            <span className="label">global lane chart</span>
            <div className="mt-1 font-display text-base italic text-ink-warm">
              live disposition
              {fkStatus === "connected" && (
                <span className="ml-2 font-sans text-[10px] not-italic uppercase tracking-chart text-ink-dim">
                  · via fourkites
                </span>
              )}
            </div>
          </div>
          <div className="pointer-events-none absolute right-5 top-4 flex items-center gap-4 font-mono text-[10px] uppercase tracking-chart text-ink-dim">
            <Legend dot="bg-risk-low" label="ok" />
            <Legend dot="bg-risk-medium" label="watch" />
            <Legend dot="bg-risk-high" label="exposed" />
            <Legend dot="bg-risk-critical" label="critical" />
          </div>
          <div className="pointer-events-none absolute bottom-4 left-5 font-mono text-[10px] uppercase tracking-chart text-ink-dim">
            drag titlebars · double-click to maximize · scroll the globe
          </div>
          <div className="pointer-events-none absolute bottom-4 right-4 flex flex-col items-end gap-2">
            <DemoCallCard />
            {process.env.NODE_ENV !== "production" && (
              <TestFireButton variant="ghost" />
            )}
          </div>
        </div>

        {/* Windows */}
        {layout && (
          <>
            <Window
              title="on the wire"
              defaultPos={layout.wire.pos}
              defaultSize={layout.wire.size}
              minSize={{ width: 240, height: 32 }}
              zIndex={zStack.wire}
              onFocus={() => focusWin("wire")}
              maxInsets={{ top: 12, right: 12, bottom: 12, left: 12 }}
            >
              <DisruptionRail
                incidents={snap?.incidents ?? []}
                selectedId={selectedAlertId}
                onSelect={(id, lat, lng) => {
                  setSelectedAlertId(id);
                  if (lat != null && lng != null) setFocus({ lat, lng });
                }}
              />
            </Window>

            <Window
              title="station"
              defaultPos={layout.station.pos}
              defaultSize={layout.station.size}
              minSize={{ width: 320, height: 32 }}
              zIndex={zStack.station}
              onFocus={() => focusWin("station")}
              maxInsets={{ top: 12, right: 12, bottom: 12, left: 12 }}
            >
              <RightPanel activity={activity} onRefreshNeeded={refresh} />
            </Window>

            <Window
              title="instruments"
              defaultPos={layout.instruments.pos}
              defaultSize={layout.instruments.size}
              minSize={{ width: 360, height: 32 }}
              zIndex={zStack.instruments}
              onFocus={() => focusWin("instruments")}
              maxInsets={{ top: 12, right: 12, bottom: 12, left: 12 }}
            >
              <div className="h-full overflow-hidden">
                <LanesHud snapshot={snap} />
              </div>
            </Window>
          </>
        )}
      </div>
    </div>
  );
}

function FkPill({
  status,
  account,
}: {
  status: ConnectionStatus;
  account: string | null;
}) {
  if (status === "unknown") return null;
  const connected = status === "connected";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-chart ${
        connected
          ? "border-risk-low/40 bg-risk-low/10 text-risk-low"
          : "border-line bg-bg-raised/40 text-ink-dim"
      }`}
      title={
        connected
          ? `FourKites Movement · ${account ?? "linked"}`
          : "FourKites not linked — connect from settings to enable live shipment data"
      }
    >
      <span
        className={`h-1 w-1 rounded-full ${
          connected ? "bg-risk-low" : "bg-ink-dim"
        }`}
      />
      fourkites · {connected ? "linked" : "offline"}
    </span>
  );
}

function Counter({
  label,
  value,
  valueClass = "text-ink",
}: {
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col items-end leading-none">
      <span className={`font-mono text-[15px] font-medium ${valueClass}`}>
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 font-mono text-[9px] uppercase tracking-chart text-ink-dim">
        {label}
      </span>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function formatDate(d: Date): string {
  const months = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ];
  return `${String(d.getDate()).padStart(2, "0")}.${months[d.getMonth()]}.${String(
    d.getFullYear(),
  ).slice(2)}`;
}

export type ActivityEntry = {
  ts: number;
  kind: string;
  payload: Record<string, unknown>;
};
