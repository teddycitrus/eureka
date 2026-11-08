"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { MeshBasicMaterial } from "three";
import { LANE_COLOR, SEVERITY_COLOR } from "./colors";
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
  camera?: () => { position: { x: number; y: number; z: number } };
  getScreenCoords?: (lat: number, lng: number, altitude?: number) => { x: number; y: number };
  getCoords?: (lat: number, lng: number, altitude?: number) => { x: number; y: number; z: number };
};

const TIP =
  "font-family:inherit;padding:8px 10px;background:#131217;border:1px solid #2a292e;border-radius:6px;color:#f2f2f3;font-size:12px;line-height:16px";

// The Black Marble night texture shows where industry is lit. It is drawn
// unlit and in greyscale so the only colour on the globe is the data.
function nightMaterial() {
  const m = new MeshBasicMaterial({ color: 0xffffff });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
       float g = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
       diffuseColor.rgb = vec3(0.004) + vec3(g) * 1.25;`,
    );
  };
  return m;
}

export function GlobeView({
  snapshot,
  focus,
  selectedAlertId,
  highlightedShipmentId,
  onSelectSupplier,
}: {
  snapshot: GlobeSnapshot | null;
  focus: { lat: number; lng: number } | null;
  selectedAlertId: string | null;
  highlightedShipmentId: string | null;
  onSelectSupplier?: (alertId: string, lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<LooseGlobe | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const material = useMemo(() => nightMaterial(), []);

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

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controls = g.controls?.();
    if (controls) {
      controls.autoRotate = !reduce;
      controls.autoRotateSpeed = 0.3;
      controls.enableZoom = true;
      controls.enableDamping = true;
    }
    g.pointOfView?.({ lat: 22, lng: 60, altitude: size.w < 768 ? 2.6 : 2.3 }, 0);
  }, [size.w, size.h]);

  // Smooth-fly to a focus point when the user clicks an incident in the rail.
  useEffect(() => {
    if (!focus) return;
    // Hold still on what the user chose instead of rotating it away.
    const controls = globeRef.current?.controls?.();
    if (controls) controls.autoRotate = false;
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

  // A name tag on every supplier carrying an open alert, so the globe reads
  // without hovering. Positioned per frame from the globe's own projection and
  // hidden when its point turns to the far side.
  const flagged = useMemo(() => points.filter((p) => p.hasAlert), [points]);
  const tagRefs = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => {
    if (flagged.length === 0 || size.w === 0) return;
    let raf = 0;
    const tick = () => {
      const g = globeRef.current;
      const cam = g?.camera?.().position;
      for (const m of flagged) {
        const el = tagRefs.current.get(m.id);
        if (!el || !g?.getScreenCoords || !g.getCoords || !cam) continue;
        const s = g.getScreenCoords(m.lat, m.lng, 0.08);
        const c = g.getCoords(m.lat, m.lng, 0);
        // Visible when the camera is on the point's side of the tangent plane.
        const facing = c.x * cam.x + c.y * cam.y + c.z * cam.z > c.x * c.x + c.y * c.y + c.z * c.z;
        // Flip the tag to the point's left when it would run off the right edge.
        const w = el.offsetWidth;
        const x = s.x + 10 + w > size.w - 8 ? s.x - 10 - w : s.x + 10;
        el.style.transform = `translate(${Math.round(x)}px, ${Math.round(s.y - 12)}px)`;
        el.style.opacity = facing ? "1" : "0";
        el.style.pointerEvents = facing ? "auto" : "none";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [flagged, size.w, size.h]);

  if (size.w === 0 || size.h === 0) {
    return <div ref={containerRef} className="h-full w-full" />;
  }

  type P = (typeof points)[number];
  type A = (typeof arcs)[number];

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <Globe
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={globeRef as unknown as React.MutableRefObject<any>}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="/earth-night.jpg"
        globeMaterial={material}
        showAtmosphere={false}
        // Suppliers as columns; the ones carrying an open alert stand taller.
        pointsData={points}
        pointLat={(d: object) => (d as P).lat}
        pointLng={(d: object) => (d as P).lng}
        pointAltitude={(d: object) => ((d as P).hasAlert ? 0.08 : 0.02)}
        pointRadius={(d: object) => ((d as P).hasAlert ? 0.7 : 0.45)}
        pointColor={(d: object) => SEVERITY_COLOR[(d as P).severity] ?? SEVERITY_COLOR.low}
        pointLabel={(d: object) => {
          const m = d as P;
          const sev = m.severity.charAt(0).toUpperCase() + m.severity.slice(1);
          return `<div style="${TIP}"><div style="font-weight:600">${m.name}</div><div style="color:#bdbdc0">${m.country}, ${m.region}</div><div style="margin-top:4px;display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:${
            SEVERITY_COLOR[m.severity] ?? SEVERITY_COLOR.low
          }"></span>${sev} risk${m.hasAlert ? ", open alert" : ""}</div></div>`;
        }}
        onPointClick={(d: object) => {
          const m = d as P;
          if (m.alertId) onSelectSupplier?.(m.alertId, m.lat, m.lng);
        }}
        // Shipments as flat surface lines (great-circle paths drawn ON the
        // sphere, like nautical chart routes). Only the highlighted shipment
        // animates dashes; everything else is a quiet solid line.
        arcsData={arcs}
        arcStartLat={(d: object) => (d as A).startLat}
        arcStartLng={(d: object) => (d as A).startLng}
        arcEndLat={(d: object) => (d as A).endLat}
        arcEndLng={(d: object) => (d as A).endLng}
        arcColor={(d: object) => LANE_COLOR[(d as A).status] ?? LANE_COLOR["on-track"]}
        arcAltitude={0}
        arcStroke={(d: object) => ((d as A).shipmentId === highlightedShipmentId ? 0.7 : 0.4)}
        arcDashLength={(d: object) => ((d as A).shipmentId === highlightedShipmentId ? 0.42 : 1)}
        arcDashGap={(d: object) => ((d as A).shipmentId === highlightedShipmentId ? 0.18 : 0)}
        arcDashAnimateTime={(d: object) =>
          (d as A).shipmentId === highlightedShipmentId ? 2000 : 0
        }
        arcLabel={(d: object) => {
          const a = d as A;
          const val = a.valueUSD ? `, $${(a.valueUSD / 1_000_000).toFixed(1)}M` : "";
          return `<div style="${TIP}"><div style="font-weight:600">${a.ref}</div><div style="color:#bdbdc0">${a.originLabel} to ${a.destLabel}</div><div style="margin-top:4px">${a.mode.charAt(0).toUpperCase() + a.mode.slice(1)}, ${a.status}${val}</div></div>`;
        }}
        // Incident pulses
        ringsData={rings}
        ringLat={(d: object) => (d as (typeof rings)[number]).lat}
        ringLng={(d: object) => (d as (typeof rings)[number]).lng}
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
            const c = SEVERITY_COLOR[i.severity] ?? SEVERITY_COLOR.critical;
            // hex to rgba with the opacity ramp the lib expects
            const r = parseInt(c.slice(1, 3), 16);
            const g = parseInt(c.slice(3, 5), 16);
            const b = parseInt(c.slice(5, 7), 16);
            return `rgba(${r},${g},${b},${1 - t})`;
          };
        }}
      />
      {flagged.map((m) => (
        <button
          key={m.id}
          type="button"
          ref={(el) => {
            if (el) tagRefs.current.set(m.id, el);
            else tagRefs.current.delete(m.id);
          }}
          onClick={() => m.alertId && onSelectSupplier?.(m.alertId, m.lat, m.lng)}
          aria-label={`${m.name}, ${m.severity} risk`}
          className="absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded border border-line bg-surface px-2 py-0.5 text-xs font-medium text-ink opacity-0 transition-[opacity,border-color] duration-200 hover:border-ink-muted"
          style={{ borderColor: m.alertId === selectedAlertId ? "rgb(var(--accent))" : undefined }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: SEVERITY_COLOR[m.severity] ?? SEVERITY_COLOR.low }}
            aria-hidden
          />
          {m.name}
        </button>
      ))}
    </div>
  );
}
