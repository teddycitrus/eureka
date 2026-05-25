"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2, Phone, Check, X, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

type State = "idle" | "pending" | "ok" | "err";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        opts: {
          sitekey: string;
          size?: "normal" | "compact" | "flexible";
          theme?: "auto" | "light" | "dark";
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

/**
 * Recruiter-facing demo card with two paths:
 *
 *   1. "Ring my phone" — POSTs to /api/demo/call-me which places a real
 *      Vapi call (rate-limited + region-whitelisted server side).
 *   2. "Play sample" — plays a pre-recorded MP3 served from /demo-call.mp3.
 *      Falls back to "no sample available" if you haven't dropped the file in
 *      public/. Free, no telephony cost, works for anyone visiting the site.
 */
export function DemoCallCard() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<State>("idle");
  const [msg, setMsg] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioState, setAudioState] = useState<"idle" | "playing" | "missing">("idle");
  const [audioReady, setAudioReady] = useState(false);

  // Turnstile state — only relevant when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRequired = Boolean(TURNSTILE_SITE_KEY);

  // Render the Turnstile widget once the global script has loaded.
  useEffect(() => {
    if (!captchaRequired) return;
    let cancelled = false;
    const tryRender = () => {
      if (cancelled) return;
      if (!window.turnstile || !turnstileRef.current) {
        window.setTimeout(tryRender, 200);
        return;
      }
      if (turnstileWidgetId.current) return; // already rendered
      turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        size: "compact",
        theme: "dark",
        callback: (token) => setCaptchaToken(token),
        "expired-callback": () => setCaptchaToken(""),
        "error-callback": () => setCaptchaToken(""),
      });
    };
    tryRender();
    return () => {
      cancelled = true;
    };
  }, [captchaRequired]);

  // Probe for the sample MP3 once on mount so we can hide the button if
  // it's not deployed yet (e.g. local dev without public/demo-call.mp3).
  useEffect(() => {
    let cancelled = false;
    fetch("/demo-call.mp3", { method: "HEAD" })
      .then((r) => {
        if (!cancelled) setAudioReady(r.ok);
      })
      .catch(() => {
        if (!cancelled) setAudioReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
          captchaToken: captchaToken || undefined,
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
        // Force a fresh CAPTCHA token after any rejection.
        if (captchaRequired && window.turnstile && turnstileWidgetId.current) {
          window.turnstile.reset(turnstileWidgetId.current);
          setCaptchaToken("");
        }
        setTimeout(() => setState("idle"), 6000);
        return;
      }
      setState("ok");
      setMsg(data.message ?? "ringing now");
      setPhone("");
      setName("");
      if (captchaRequired && window.turnstile && turnstileWidgetId.current) {
        window.turnstile.reset(turnstileWidgetId.current);
        setCaptchaToken("");
      }
      setTimeout(() => setState("idle"), 8000);
    } catch {
      setState("err");
      setMsg("network error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  function toggleSample() {
    const el = audioRef.current;
    if (!el) return;
    if (audioState === "playing") {
      el.pause();
      el.currentTime = 0;
      setAudioState("idle");
      return;
    }
    el.play()
      .then(() => setAudioState("playing"))
      .catch(() => setAudioState("missing"));
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
        eureka will phone your number with a 30-second briefing, then text a
        short summary. one call per number per day. us · uk · au only.
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
      {captchaRequired && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="lazyOnload"
            async
            defer
          />
          <div
            ref={turnstileRef}
            className={cn("flex justify-center", captchaToken && "hidden")}
          />
        </>
      )}
      <button
        type="submit"
        disabled={state === "pending" || !phone || (captchaRequired && !captchaToken)}
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

      {audioReady && (
        <>
          <div className="my-1 flex items-center gap-2 font-mono text-[9px] uppercase tracking-chart text-ink-dim">
            <span className="h-px flex-1 bg-line/60" />
            or hear a sample
            <span className="h-px flex-1 bg-line/60" />
          </div>
          <p className="font-mono text-[10px] italic leading-relaxed text-ink-dim">
            prerecorded clip. the live agent does full back-and-forth, can
            transfer or escalate to on-call staff, and posts decisions into
            slack.
          </p>
          <button
            type="button"
            onClick={toggleSample}
            className={cn(
              "inline-flex items-center justify-center gap-2 border px-3 py-1.5 font-mono text-[10px] uppercase tracking-chart transition-colors",
              audioState === "playing"
                ? "border-risk-low/50 bg-risk-low/15 text-risk-low"
                : "border-line bg-bg-raised/50 text-ink-muted hover:border-amber/50 hover:text-amber",
            )}
          >
            {audioState === "playing" ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            {audioState === "playing" ? "stop sample" : "play sample call"}
          </button>
          <audio
            ref={audioRef}
            src="/demo-call.mp3"
            preload="none"
            onEnded={() => setAudioState("idle")}
            onError={() => setAudioState("missing")}
          />
          {audioState === "missing" && (
            <span className="font-mono text-[10px] uppercase tracking-chart text-risk-critical">
              sample unavailable
            </span>
          )}
        </>
      )}
    </form>
  );
}
