"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { Window } from "@/components/window";

const STORAGE_KEY = "eureka.fk.connected";
const STORAGE_ACCOUNT = "eureka.fk.account";
const STORAGE_SKIPPED = "eureka.fk.skipped";

export type ConnectionStatus = "unknown" | "connected" | "skipped";

/**
 * A "Connect to FourKites" handshake window.
 * Demo-only — no real auth happens. We persist a flag in localStorage so
 * the dialog only appears once per browser, and broadcast a connected
 * status to the parent so the masthead pill can reflect it.
 */
export function FourKitesLogin({
  onStatus,
  requestOpen = 0,
}: {
  onStatus: (status: ConnectionStatus, account?: string) => void;
  /** Bump to open the dialog again (e.g. from a Connect button). */
  requestOpen?: number;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [account, setAccount] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [phase, setPhase] = useState<"idle" | "connecting" | "ok">("idle");
  const report = useRef(onStatus);
  report.current = onStatus;

  const W = 480;
  const H = 560;
  function show() {
    setPos({
      x: Math.max(16, Math.floor(window.innerWidth / 2 - W / 2)),
      y: Math.max(16, Math.floor(window.innerHeight / 2 - H / 2)),
    });
    setPhase("idle");
    setOpen(true);
  }

  useEffect(() => {
    const isConnected = window.localStorage.getItem(STORAGE_KEY) === "true";
    const savedAccount = window.localStorage.getItem(STORAGE_ACCOUNT) ?? undefined;
    if (isConnected) return report.current("connected", savedAccount);
    if (
      window.localStorage.getItem(STORAGE_SKIPPED) === "true" ||
      new URLSearchParams(window.location.search).has("sample")
    )
      return report.current("skipped");
    show();
    report.current("unknown");
  }, []);

  useEffect(() => {
    if (requestOpen > 0) show();
  }, [requestOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && phase === "idle" && skip();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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
        report.current("connected", account.trim());
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
    report.current("skipped");
    setOpen(false);
  }

  if (!open || !pos) return null;

  const fitW = Math.min(W, window.innerWidth - 32);
  const fitH = Math.min(H, window.innerHeight - 32);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Connect FourKites">
      <div className="pointer-events-auto absolute inset-0 bg-black/60" onClick={skip} />
      <Window
        title="Connect FourKites"
        defaultPos={{ x: Math.max(16, pos.x), y: pos.y }}
        defaultSize={{ width: fitW, height: fitH }}
        minSize={{ width: Math.min(360, fitW), height: 320 }}
        zIndex={71}
        bounds="parent"
        onClose={skip}
        dialog
        className="pointer-events-auto"
      >
        <form onSubmit={authorize} className="flex h-full flex-col overflow-y-auto px-5 py-4">
          <div className="rounded-md bg-raised px-4 py-3">
            <p className="text-sm text-ink">
              This is a portfolio demo. No account is checked, and the sample network works the same
              as a linked one.
            </p>
            <button
              type="button"
              onClick={skip}
              disabled={phase !== "idle"}
              className="btn btn-primary mt-3"
            >
              Use sample data
            </button>
          </div>

          <h3 className="mt-5 text-lg font-semibold text-ink">FourKites Movement</h3>
          <p className="mt-1 text-sm text-ink-soft">
            A customer links their account here. Eureka then reads live shipment telemetry, lane
            geometry and predicted ETAs, overlays news signal and places the calls.
          </p>

          <div className="mt-4 grid gap-4">
            <Field label="Account ID" hint="Settings in app.fourkites.com">
              <input
                required
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="FK-00421"
                className="field"
                disabled={phase !== "idle"}
              />
            </Field>
            <Field label="API key" hint="Server-to-server token">
              <input
                required
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="fk_live_..."
                className="field"
                disabled={phase !== "idle"}
                autoComplete="off"
              />
            </Field>
          </div>

          <h4 className="mt-5 text-xs text-ink-muted">Eureka asks to</h4>
          <ul className="mt-1 space-y-0.5 text-sm text-ink-soft">
            <li>Read shipments, lanes and ETAs</li>
            <li>Subscribe to status webhooks</li>
            <li>Submit reroute proposals for your approval</li>
          </ul>

          <div className="mt-auto flex items-center justify-between gap-3 pt-5">
            <span className="text-xs text-ink-muted">The key stays in this browser.</span>
            <button
              type="submit"
              disabled={phase !== "idle" || !account.trim() || !apiKey.trim()}
              className="btn btn-secondary"
            >
              {phase === "connecting" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {phase === "ok" && <Check className="h-3.5 w-3.5 text-positive" aria-hidden />}
              {phase === "ok" ? "Connected" : phase === "connecting" ? "Authorizing" : "Authorize"}
            </button>
          </div>
        </form>
      </Window>
    </div>
  );
}

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
      <span className="text-xs">
        <span className="font-medium text-ink">{label}</span>
        {hint && <span className="ml-2 text-ink-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
