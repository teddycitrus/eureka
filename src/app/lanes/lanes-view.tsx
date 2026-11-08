"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { EurekaMark } from "@/components/eureka-mark";
import { DemoCallCard } from "@/components/demo-call-card";
import { Window } from "@/components/window";
import { FourKitesLogin, type ConnectionStatus } from "@/components/fourkites-login";
import { DisruptionRail } from "./disruption-rail";
import { RightPanel } from "./right-panel";
import { LanesHud, computeStats, money } from "./lanes-hud";
import { LANE_COLOR, SEVERITY_COLOR } from "./colors";
import type { GlobeSnapshot } from "./types";

const GlobeView = dynamic(() => import("./globe-view").then((m) => m.GlobeView), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center text-sm text-ink-muted">
      Loading the globe
    </div>
  ),
});

type WinId = "wire" | "station" | "instruments" | "call";

const NARROW = 1024;

export function LanesView() {
  const [snap, setSnap] = useState<GlobeSnapshot | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [highlightedShipmentId, setHighlightedShipmentId] = useState<string | null>(null);
  const [fkStatus, setFkStatus] = useState<ConnectionStatus>("unknown");
  const [fkAccount, setFkAccount] = useState<string | null>(null);
  const [fkRequest, setFkRequest] = useState(0);

  // Window manager state — z-index per window, bumped on focus
  const [zStack, setZStack] = useState<Record<WinId, number>>({
    wire: 10,
    station: 11,
    instruments: 9,
    call: 12,
  });
  const topZRef = useRef(12);
  const focusWin = useCallback((id: WinId) => {
    topZRef.current += 1;
    const next = topZRef.current;
    setZStack((s) => (s[id] === next ? s : { ...s, [id]: next }));
  }, []);

  // Measure the bounds container so Windows can place themselves correctly on first paint.
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [vw, setVw] = useState(0);
  useEffect(() => {
    const u = () => setVw(window.innerWidth);
    u();
    window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);
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
      setUpdatedAt(new Date());
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
    return () => es.close();
  }, [refresh]);

  const stats = useMemo(() => computeStats(snap), [snap]);
  const narrow = vw > 0 && vw < NARROW;
  const ready = !narrow && stage.w > 320 && stage.h > 240;

  const select = useCallback((id: string | null, lat: number | null, lng: number | null) => {
    setSelectedAlertId(id);
    if (lat != null && lng != null) setFocus({ lat, lng });
  }, []);

  // Initial layout on one 16px gutter, outer margins equal on all sides:
  //  - wire: full-height column on the left
  //  - station + call: stacked in the right column, call at the foot
  //  - instruments: strip along the bottom of the centre column
  //  wireW + gap + centreW + gap + rightW + 2 * margin = stage.w
  const layout = useMemo(() => {
    if (!ready) return null;
    const margin = 16;
    const gap = 16;
    const callH = 236;
    const hudH = 132;
    const wireW = Math.round(Math.min(340, Math.max(280, stage.w * 0.22)));
    const rightW = Math.round(Math.min(440, Math.max(360, stage.w * 0.28)));
    const fullH = stage.h - margin * 2;
    const stationH = Math.max(240, fullH - gap - callH);
    const centerX = margin + wireW + gap;
    const centerW = stage.w - margin * 2 - wireW - rightW - gap * 2;
    const rightX = stage.w - rightW - margin;
    return {
      wire: { pos: { x: margin, y: margin }, size: { width: wireW, height: fullH } },
      station: { pos: { x: rightX, y: margin }, size: { width: rightW, height: stationH } },
      call: {
        pos: { x: rightX, y: margin + stationH + gap },
        size: { width: rightW, height: fullH - stationH - gap },
      },
      instruments: {
        pos: { x: centerX, y: stage.h - hudH - margin },
        size: { width: centerW, height: hudH },
      },
      legendX: centerX + centerW / 2,
    };
  }, [ready, stage]);

  const wire = (
    <DisruptionRail
      incidents={snap?.incidents ?? []}
      markers={snap?.markers ?? []}
      shipments={snap?.shipments ?? []}
      loading={snap === null}
      selectedId={selectedAlertId}
      onSelect={select}
    />
  );
  const station = (
    <RightPanel
      activity={activity}
      openRisks={stats.openAlerts}
      selectedAlertId={selectedAlertId}
      onRefreshNeeded={refresh}
    />
  );
  const hud = <LanesHud stats={stats} loading={snap === null} />;
  const wireMeta = snap ? `${stats.openAlerts} open` : undefined;

  return (
    <div className={narrow ? "flex min-h-screen flex-col" : "flex h-screen flex-col"}>
      <header className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-1 border-b border-line px-4 py-3 lg:h-14 lg:flex-nowrap lg:py-0">
        <div className="flex min-w-0 items-center gap-3">
          <EurekaMark />
          <span className="hidden text-base font-semibold text-ink sm:inline">Eureka</span>
          <span className="hidden text-ink-muted sm:inline" aria-hidden>
            /
          </span>
          <h1 className="truncate text-lg font-semibold text-ink">Global lanes</h1>
        </div>
        <p className="order-last w-full text-sm text-ink-soft lg:order-none lg:w-auto lg:flex-1 lg:truncate">
          {snap ? finding(stats) : "Reading the network"}
        </p>
        <div className="ml-auto flex items-center gap-4 text-xs text-ink-muted">
          <span className="hidden tabular-nums sm:inline">
            {updatedAt ? `Live, updated ${clock(updatedAt)}` : "Live"}
          </span>
          <FkStatus
            status={fkStatus}
            account={fkAccount}
            onConnect={() => setFkRequest((n) => n + 1)}
          />
        </div>
      </header>

      <FourKitesLogin
        requestOpen={fkRequest}
        onStatus={(s, account) => {
          setFkStatus(s);
          if (account) setFkAccount(account);
        }}
      />

      {/* ── Stage: globe behind, windows on top ────────────────── */}
      <div
        ref={stageRef}
        className={
          narrow ? "relative h-[62vh] min-h-[360px] shrink-0 overflow-hidden" : "relative min-h-0 flex-1 overflow-hidden"
        }
      >
        <div className="absolute inset-0">
          <GlobeView
            snapshot={snap}
            focus={focus}
            selectedAlertId={selectedAlertId}
            highlightedShipmentId={highlightedShipmentId}
            onSelectSupplier={select}
          />
        </div>
        <Legend
          className={narrow ? "left-4 right-4 top-3" : "top-4 -translate-x-1/2"}
          style={layout ? { left: layout.legendX } : undefined}
        />

        {layout && (
          <>
            <Window
              title="Disruptions"
              titleAccessory={wireMeta}
              defaultPos={layout.wire.pos}
              defaultSize={layout.wire.size}
              minSize={{ width: 260, height: 40 }}
              zIndex={zStack.wire}
              onFocus={() => focusWin("wire")}
            >
              {wire}
            </Window>
            <Window
              title="Operations"
              defaultPos={layout.station.pos}
              defaultSize={layout.station.size}
              minSize={{ width: 340, height: 40 }}
              zIndex={zStack.station}
              onFocus={() => focusWin("station")}
            >
              {station}
            </Window>
            <Window
              title="Network"
              defaultPos={layout.instruments.pos}
              defaultSize={layout.instruments.size}
              minSize={{ width: 360, height: 40 }}
              zIndex={zStack.instruments}
              onFocus={() => focusWin("instruments")}
            >
              {hud}
            </Window>
            <Window
              title="Hear a briefing"
              defaultPos={layout.call.pos}
              defaultSize={layout.call.size}
              minSize={{ width: 300, height: 40 }}
              zIndex={zStack.call}
              onFocus={() => focusWin("call")}
            >
              <DemoCallCard />
            </Window>
          </>
        )}
      </div>

      {narrow && (
        <div className="grid items-start gap-4 p-4 md:grid-cols-2">
          <Window docked title="Network" defaultPos={ORIGIN} defaultSize={ORIGIN_SIZE} className="md:col-span-2">
            {hud}
          </Window>
          <Window docked title="Disruptions" titleAccessory={wireMeta} defaultPos={ORIGIN} defaultSize={ORIGIN_SIZE}>
            {wire}
          </Window>
          <div className="grid gap-4">
            <Window docked title="Hear a briefing" defaultPos={ORIGIN} defaultSize={ORIGIN_SIZE}>
              <DemoCallCard />
            </Window>
            <Window docked title="Operations" defaultPos={ORIGIN} defaultSize={ORIGIN_SIZE} className="h-[600px]">
              {station}
            </Window>
          </div>
        </div>
      )}
    </div>
  );
}

const ORIGIN = { x: 0, y: 0 };
const ORIGIN_SIZE = { width: 0, height: 0 };

function finding(s: ReturnType<typeof computeStats>): string {
  if (s.openAlerts === 0) return "No open risks. Every lane is clear of known disruption.";
  const risks = `${s.openAlerts} open risk${s.openAlerts === 1 ? "" : "s"}`;
  if (s.exposedValue === 0) return `${risks}. No cargo in transit ships from an affected supplier.`;
  return `${risks}. ${money(s.exposedValue)} of ${money(s.inTransitValue)} in transit ships from suppliers under alert.`;
}

function clock(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function FkStatus({
  status,
  account,
  onConnect,
}: {
  status: ConnectionStatus;
  account: string | null;
  onConnect: () => void;
}) {
  if (status === "unknown") return null;
  if (status === "connected") {
    return (
      <span className="text-ink-soft" title="FourKites Movement is linked">
        FourKites {account ?? "linked"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-3">
      <span className="hidden md:inline">Sample data</span>
      <button type="button" onClick={onConnect} className="btn btn-secondary h-7 px-3 text-xs">
        Connect FourKites
      </button>
    </span>
  );
}

function Legend({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const sev: Array<[string, string]> = [
    ["low", "Low"],
    ["medium", "Medium"],
    ["high", "High"],
    ["critical", "Critical"],
  ];
  const lanes: Array<[string, string]> = [
    ["on-track", "On track"],
    ["delayed", "Delayed"],
    ["rerouted", "Rerouted by Eureka"],
  ];
  return (
    <div
      style={style}
      className={`pointer-events-none absolute flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft ${className ?? ""}`}
    >
      <span className="whitespace-nowrap">
        Supplier risk{" "}
        {sev.map(([k, label]) => (
          <span key={k} className="ml-2 font-semibold" style={{ color: SEVERITY_COLOR[k] }}>
            {label}
          </span>
        ))}
      </span>
      <span className="h-3 w-px bg-line" aria-hidden />
      {lanes.map(([k, label]) => (
        <span key={k} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="h-0.5 w-4" style={{ background: LANE_COLOR[k] }} />
          {label}
        </span>
      ))}
    </div>
  );
}

export type ActivityEntry = {
  ts: number;
  kind: string;
  payload: Record<string, unknown>;
};
