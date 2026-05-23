"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, ShieldCheck, Plug } from "lucide-react";
import { Window } from "@/components/window";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "iris.fk.connected";
const STORAGE_ACCOUNT = "iris.fk.account";
const STORAGE_SKIPPED = "iris.fk.skipped";

export type ConnectionStatus = "unknown" | "connected" | "skipped";

/**
 * A "Connect to FourKites" handshake window.
 * Demo-only — no real auth happens. We persist a flag in localStorage so
 * the dialog only appears once per browser, and broadcast a connected
 * status to the parent so the masthead pill can reflect it.
 */
export function FourKitesLogin({
  onStatus,
}: {
  onStatus: (status: ConnectionStatus, account?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [account, setAccount] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [phase, setPhase] = useState<"idle" | "connecting" | "ok">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isConnected = window.localStorage.getItem(STORAGE_KEY) === "true";
    const savedAccount = window.localStorage.getItem(STORAGE_ACCOUNT) ?? undefined;
    if (isConnected) {
      onStatus("connected", savedAccount);
      return;
    }
    if (window.localStorage.getItem(STORAGE_SKIPPED) === "true") {
      onStatus("skipped");
      return;
    }
    const W = 520;
    const H = 580;
    setPos({
      x: Math.max(20, Math.floor(window.innerWidth / 2 - W / 2)),
      y: Math.max(40, Math.floor(window.innerHeight / 2 - H / 2)),
    });
    setOpen(true);
    onStatus("unknown");
  }, [onStatus]);

  function authorize(e: React.FormEvent) {
    e.preventDefault();
    if (!account.trim() || !apiKey.trim()) return;
    setPhase("connecting");
    window.setTimeout(() => {
      setPhase("ok");
      window.setTimeout(() => {
        try {
          window.localStorage.setItem(STORAGE_KEY, "true");
          window.localStorage.setItem(STORAGE_ACCOUNT, account.trim());
        } catch {
          /* ignore — private mode etc */
        }
        onStatus("connected", account.trim());
        setOpen(false);
      }, 700);
    }, 1100);
  }

  function skip() {
    try {
      window.localStorage.setItem(STORAGE_SKIPPED, "true");
    } catch {
      /* ignore — private mode etc */
    }
    onStatus("skipped");
    setOpen(false);
  }

  if (!open || !pos) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      {/* Soft scrim that hints at the dashboard behind without fully blocking it */}
      <div className="pointer-events-auto absolute inset-0 bg-bg/40 backdrop-blur-[2px]" />
      <Window
        title="connect data source"
        defaultPos={pos}
        defaultSize={{ width: 520, height: 580 }}
        minSize={{ width: 380, height: 360 }}
        zIndex={71}
        bounds="parent"
        onClose={skip}
        className="pointer-events-auto shadow-instrument"
      >
        <form
          onSubmit={authorize}
          className="flex h-full flex-col overflow-y-auto px-6 pb-5 pt-5"
        >
          <div className="mb-4 border border-amber/40 bg-amber/10 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-chart text-amber">
                portfolio demo · no real auth
              </span>
              <button
                type="button"
                onClick={skip}
                disabled={phase !== "idle"}
                className="border border-amber/60 bg-amber/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-chart text-amber hover:bg-amber/25 disabled:opacity-50"
              >
                skip · use sample data →
              </button>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
              In production, a customer would link their <span className="text-ink">FourKites Movement</span> account
              here so Iris could pull live shipment telemetry and ETAs.
              For this demo, click <span className="text-amber">skip</span> to load synthetic
              supply-chain data — the rest of the dashboard works exactly the same.
            </p>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="label">data source</span>
              <h3 className="mt-1 font-display text-lg italic text-ink-warm">
                fourkites movement
              </h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
                Iris pulls live shipment telemetry, lane geometry and predicted
                ETAs from your FourKites Movement account, then overlays news
                signal and dispatches voice ops on top. Authorize once.
              </p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center border border-line bg-bg-raised">
              <Plug className="h-4 w-4 text-amber" />
            </span>
          </div>

          <div className="mt-5 grid gap-4">
            <Field label="Account ID" hint="from app.fourkites.com → settings">
              <input
                required
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="FK-00421"
                className={inputClass + " font-mono"}
                disabled={phase !== "idle"}
              />
            </Field>
            <Field label="API key" hint="server-to-server token">
              <input
                required
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="fk_live_••••••••••••••••"
                className={inputClass + " font-mono"}
                disabled={phase !== "idle"}
                autoComplete="off"
              />
            </Field>
            <Field label="Webhook delivery" hint="we register this on your behalf">
              <input
                readOnly
                value="https://iris.local/api/fourkites/webhook"
                className={cn(inputClass, "font-mono cursor-default text-ink-muted")}
              />
            </Field>
          </div>

          <div className="mt-5 border-l-2 border-amber/40 bg-amber/5 px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-chart text-amber">
              scopes requested
            </span>
            <ul className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-ink-muted">
              <li>· read shipments, lanes, ETAs</li>
              <li>· subscribe to status webhooks</li>
              <li>· submit reroute proposals (advisory)</li>
            </ul>
          </div>

          <div className="mt-auto flex items-center justify-between pt-5">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-chart text-ink-dim">
              <ShieldCheck className="h-3 w-3" />
              token never leaves your browser
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={skip}
                disabled={phase !== "idle"}
                className="border border-line bg-bg-raised/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-chart text-ink-muted hover:text-ink disabled:opacity-50"
              >
                skip for now
              </button>
              <button
                type="submit"
                disabled={phase !== "idle" || !account.trim() || !apiKey.trim()}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-chart transition-colors",
                  phase === "ok"
                    ? "border border-risk-low/60 bg-risk-low/15 text-risk-low"
                    : "border border-amber/60 bg-amber/15 text-amber hover:bg-amber/25 hover:border-amber disabled:opacity-50",
                )}
              >
                {phase === "connecting" && <Loader2 className="h-3 w-3 animate-spin" />}
                {phase === "ok" && <Check className="h-3 w-3" />}
                {phase === "idle" && <Plug className="h-3 w-3" />}
                {phase === "ok"
                  ? "connected"
                  : phase === "connecting"
                    ? "authorizing"
                    : "authorize"}
              </button>
            </div>
          </div>
        </form>
      </Window>
    </div>
  );
}

const inputClass =
  "h-9 w-full border border-line bg-bg-raised/60 px-3 text-[12px] text-ink placeholder:text-ink-dim focus:border-amber/60 focus:outline-none focus:ring-1 focus:ring-amber/40";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">
        {label}
        {hint && (
          <span className="ml-2 normal-case tracking-normal text-ink-dim/80">
            · {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
