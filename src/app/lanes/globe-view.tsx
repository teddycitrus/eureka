"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import type { GlobeSnapshot } from "./types";

// react-globe.gl's typed methods vary by version; we call them through a
// loose interface so missing methods degrade to a no-op instead of crashing.
type LooseGlobe = {
  controls?: () => {
    autoRotate?: boolean;
    autoRotateSpeed?: number;
    enableZoom?: boolean;
    enableDamping?: boolean;
  };
  pointOfView?: (
    coords: { lat: number; lng: number; altitude: number },
    durationMs?: number,
  ) => void;
};

const SEVERITY_COLOR: Record<string, string> = {
  low: "#5CC78D",
  medium: "#E5A86E",
  high: "#E96B7C",
  critical: "#D4435E",
};

const STATUS_GRADIENT: Record<string, [string, string]> = {
  "on-track": ["#7FE3E3", "#4F5572"],
  rerouted: ["#E96B7C", "#7FE3E3"],
  delayed: ["#E5A86E", "#E96B7C"],
  held: ["#666D88", "#666D88"],
  arrived: ["#5CC78D", "#7FE3E3"],
};

export function GlobeView({
  snapshot,
  focus,
  selectedAlertId,
  highlightedShipmentId,
}: {
  snapshot: GlobeSnapshot | null;
  focus: { lat: number; lng: number } | null;
  selectedAlertId: string | null;
  highlightedShipmentId: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<LooseGlobe | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Track container dimensions for the globe canvas.
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Configure the globe once it's mounted. Every call is guarded — older
  // and newer react-globe.gl versions expose slightly different methods, and
  // some methods only become available a frame or two after first paint.
  useEffect(() => {
    const g = globeRef.current;
    if (!g || size.w === 0) return;

    const controls = g.controls?.();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
      controls.enableZoom = true;
      controls.enableDamping = true;
    }
    g.pointOfView?.({ lat: 18, lng: 30, altitude: 2.4 }, 0);

  }, [size.w, size.h]);

  // Smooth-fly to a focus point when the user clicks an incident in the rail.
  useEffect(() => {
    if (!focus) return;
    globeRef.current?.pointOfView?.(
      { lat: focus.lat, lng: focus.lng, altitude: 1.6 },
      1100,
    );
  }, [focus]);

  const points = useMemo(() => snapshot?.markers ?? [], [snapshot]);
  const arcs = useMemo(() => snapshot?.arcs ?? [], [snapshot]);
  // Only the selected incident gets a pulsing ring — everything else is a
  // static dot via the points layer. Quiet by default; loud when chosen.
  const rings = useMemo(() => {
    if (!selectedAlertId) return [];
    return (snapshot?.incidents ?? []).filter(
      (i): i is typeof i & { lat: number; lng: number } =>
        i.id === selectedAlertId &&
        typeof i.lat === "number" &&
        typeof i.lng === "number",
    );
  }, [snapshot, selectedAlertId]);

  if (size.w === 0 || size.h === 0) {
    return <div ref={containerRef} className="h-full w-full" />;
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <Globe
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={globeRef as unknown as React.MutableRefObject<any>}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        showAtmosphere
        atmosphereColor="#7FA3D8"
        atmosphereAltitude={0.16}
        // Suppliers as glowing points
        pointsData={points}
        pointLat={(d: object) => (d as (typeof points)[number]).lat}
        pointLng={(d: object) => (d as (typeof points)[number]).lng}
        pointAltitude={(d: object) =>
          (d as (typeof points)[number]).hasAlert ? 0.06 : 0.015
        }
        pointRadius={(d: object) =>
          (d as (typeof points)[number]).hasAlert ? 0.55 : 0.35
        }
        pointColor={(d: object) => {
          const m = d as (typeof points)[number];
          return SEVERITY_COLOR[m.severity] ?? "#A883FF";
        }}
        pointLabel={(d: object) => {
          const m = d as (typeof points)[number];
          return `<div style="font-family:ui-sans-serif;padding:6px 8px;background:rgba(20,12,40,.92);border:1px solid rgba(168,131,255,.4);border-radius:8px;color:#F4F0FF;font-size:11px;line-height:1.35"><div style="font-weight:600">${m.name}</div><div style="opacity:.7">${m.country} · ${m.region}</div><div style="margin-top:4px;text-transform:uppercase;letter-spacing:.12em;color:${
            SEVERITY_COLOR[m.severity] ?? "#A883FF"
          }">${m.severity}${m.hasAlert ? " · ALERT" : ""}</div></div>`;
        }}
        // Shipments as flat surface lines (great-circle paths drawn ON the
        // sphere, like nautical chart routes). Only the highlighted shipment
        // animates dashes; everything else is a quiet solid line.
        arcsData={arcs}
        arcStartLat={(d: object) => (d as (typeof arcs)[number]).startLat}
        arcStartLng={(d: object) => (d as (typeof arcs)[number]).startLng}
        arcEndLat={(d: object) => (d as (typeof arcs)[number]).endLat}
        arcEndLng={(d: object) => (d as (typeof arcs)[number]).endLng}
        arcColor={(d: object) => {
          const a = d as (typeof arcs)[number];
          return STATUS_GRADIENT[a.status] ?? STATUS_GRADIENT["on-track"];
        }}
        arcAltitude={0}
        arcStroke={(d: object) =>
          (d as (typeof arcs)[number]).shipmentId === highlightedShipmentId ? 0.6 : 0.35
        }
        arcDashLength={(d: object) =>
          (d as (typeof arcs)[number]).shipmentId === highlightedShipmentId ? 0.42 : 1
        }
        arcDashGap={(d: object) =>
          (d as (typeof arcs)[number]).shipmentId === highlightedShipmentId ? 0.18 : 0
        }
        arcDashAnimateTime={(d: object) =>
          (d as (typeof arcs)[number]).shipmentId === highlightedShipmentId ? 2000 : 0
        }
        arcLabel={(d: object) => {
          const a = d as (typeof arcs)[number];
          const val = a.valueUSD ? `$${(a.valueUSD / 1_000_000).toFixed(1)}M` : "";
          return `<div style="font-family:ui-sans-serif;padding:6px 8px;background:rgba(20,12,40,.92);border:1px solid rgba(168,131,255,.4);border-radius:8px;color:#F4F0FF;font-size:11px;line-height:1.35"><div style="font-weight:600">${a.ref}</div><div style="opacity:.7">${a.originLabel} → ${a.destLabel}</div><div style="margin-top:4px;text-transform:uppercase;letter-spacing:.12em;opacity:.85">${a.mode} · ${a.status}${val ? ` · ${val}` : ""}</div></div>`;
        }}
        // Incident pulses
        ringsData={rings}
        ringLat={(d: object) =>
          (d as (typeof rings)[number] & { lat: number }).lat
        }
        ringLng={(d: object) =>
          (d as (typeof rings)[number] & { lng: number }).lng
        }
        ringMaxRadius={(d: object) => {
          const i = d as (typeof rings)[number];
          return i.severity === "critical" ? 6 : i.severity === "high" ? 4.5 : 3;
        }}
        ringPropagationSpeed={2.4}
        ringRepeatPeriod={(d: object) => {
          const i = d as (typeof rings)[number];
          return i.severity === "critical" ? 700 : 1100;
        }}
        ringColor={(d: object) => {
          const i = d as (typeof rings)[number];
          return (t: number) => {
            const c = SEVERITY_COLOR[i.severity] ?? "#FB7185";
            // hex to rgba with the opacity ramp the lib expects
            const r = parseInt(c.slice(1, 3), 16);
            const g = parseInt(c.slice(3, 5), 16);
            const b = parseInt(c.slice(5, 7), 16);
            return `rgba(${r},${g},${b},${1 - t})`;
          };
        }}
      />
    </div>
  );
}
