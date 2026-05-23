"use client";

import { useState } from "react";
import { Loader2, Phone, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type State = "idle" | "pending" | "ok" | "err";

/**
 * "Call me" demo card — recruiter-facing entry point. Posts to
 * /api/demo/call-me which enforces every rate limit and region check
 * server-side. We deliberately keep the UI dumb and let the server own
 * the truth about what is and isn't allowed.
 */
export function DemoCallCard() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<State>("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "pending") return;
    setState("pending");
    setMsg(null);
    try {
      const res = await fetch("/api/demo/call-me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          name: name.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
        retryAfter?: number;
      };
      if (!res.ok || !data.ok) {
        setState("err");
        setMsg(
          data.error ??
            (res.status === 429
              ? "rate limited — try again later"
              : `failed (${res.status})`),
        );
        setTimeout(() => setState("idle"), 6000);
        return;
      }
      setState("ok");
      setMsg(data.message ?? "ringing now");
      setPhone("");
      setName("");
      setTimeout(() => setState("idle"), 8000);
    } catch {
      setState("err");
      setMsg("network error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="pointer-events-auto flex w-[280px] flex-col gap-2 border border-line/80 bg-bg-raised/85 p-3 backdrop-blur"
    >
      <div className="flex items-center justify-between">
        <span className="label">demo · call me</span>
        <span className="font-mono text-[9px] uppercase tracking-chart text-ink-dim">
          1 call · &lt;90s
        </span>
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-ink-muted">
        iris will phone your number with a 30-second briefing. one call per
        number per day. us · uk · au only.
      </p>
      <input
        type="text"
        inputMode="text"
        autoComplete="name"
        placeholder="your name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={state === "pending"}
        maxLength={40}
        className="border border-line bg-bg/60 px-2 py-1 font-mono text-[11px] text-ink placeholder:text-ink-dim focus:border-amber/60 focus:outline-none"
      />
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+14155551212"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={state === "pending"}
        required
        pattern="^\+\d{8,15}$"
        maxLength={16}
        className="border border-line bg-bg/60 px-2 py-1 font-mono text-[11px] text-ink placeholder:text-ink-dim focus:border-amber/60 focus:outline-none"
      />
      <button
        type="submit"
        disabled={state === "pending" || !phone}
        className={cn(
          "inline-flex items-center justify-center gap-2 border px-3 py-1.5 font-mono text-[10px] uppercase tracking-chart transition-colors",
          state === "ok" && "border-risk-low/50 bg-risk-low/15 text-risk-low",
          state === "err" && "border-risk-critical/50 bg-risk-critical/15 text-risk-critical",
          state !== "ok" && state !== "err" &&
            "border-amber/60 bg-amber/15 text-amber hover:bg-amber/25 disabled:opacity-50",
        )}
      >
        {state === "pending" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : state === "ok" ? (
          <Check className="h-3 w-3" />
        ) : state === "err" ? (
          <X className="h-3 w-3" />
        ) : (
          <Phone className="h-3 w-3" />
        )}
        {state === "pending"
          ? "calling"
          : state === "ok"
            ? "ringing"
            : state === "err"
              ? "blocked"
              : "ring my phone"}
      </button>
      {msg && (
        <span
          className={cn(
            "font-mono text-[10px] uppercase tracking-chart",
            state === "err" ? "text-risk-critical" : "text-ink-muted",
          )}
        >
          {msg}
        </span>
      )}
    </form>
  );
}
