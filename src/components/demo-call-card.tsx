"use client";

import { useEffect, useId, useRef, useState } from "react";
import Script from "next/script";
import { Loader2, Phone, Check } from "lucide-react";
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
 * Recruiter-facing demo card. POSTs to /api/demo/call-me which places a real
 * Vapi call (rate-limited + region-whitelisted server side) and follows up
 * with an SMS summary once the call ends.
 */
export function DemoCallCard() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<State>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const id = useId();

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
        size: "flexible",
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
              ? "Too many calls from here. Try again later."
              : `The call could not be placed (${res.status}).`),
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
      setMsg(data.message ?? "Your phone is ringing.");
      setPhone("");
      setName("");
      if (captchaRequired && window.turnstile && turnstileWidgetId.current) {
        window.turnstile.reset(turnstileWidgetId.current);
        setCaptchaToken("");
      }
      setTimeout(() => setState("idle"), 8000);
    } catch {
      setState("err");
      setMsg("No connection. Check your network and try again.");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  return (
    <form onSubmit={submit} className="flex h-full flex-col gap-3 overflow-y-auto px-4 py-3">
      <p className="text-sm text-ink-soft">
        Eureka phones you with a 30-second briefing on this network, then texts a summary. One call
        per number a day, US, UK and AU numbers.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5" htmlFor={`${id}-name`}>
          <span className="text-xs text-ink-muted">Name, optional</span>
          <input
            id={`${id}-name`}
            type="text"
            autoComplete="name"
            placeholder="Alex"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={state === "pending"}
            maxLength={40}
            className="field"
          />
        </label>
        <label className="flex flex-col gap-1.5" htmlFor={`${id}-phone`}>
          <span className="text-xs text-ink-muted">Phone, with country code</span>
          <input
            id={`${id}-phone`}
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
            className="field tabular-nums"
          />
        </label>
      </div>
      {captchaRequired && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="lazyOnload"
            async
            defer
          />
          <div ref={turnstileRef} className={cn(captchaToken && "hidden")} />
        </>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={state === "pending" || !phone || (captchaRequired && !captchaToken)}
          className="btn btn-primary"
        >
          {state === "pending" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : state === "ok" ? (
            <Check className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Phone className="h-3.5 w-3.5" aria-hidden />
          )}
          {state === "pending" ? "Calling" : state === "ok" ? "Ringing" : "Call my phone"}
        </button>
        {msg && (
          <span
            role="status"
            className={cn("text-xs", state === "err" ? "text-negative" : "text-ink-soft")}
          >
            {msg}
          </span>
        )}
      </div>
    </form>
  );
}
