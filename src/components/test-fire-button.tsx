"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Zap, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function TestFireButton({
  variant = "primary",
  redirect,
}: {
  variant?: "primary" | "ghost";
  redirect?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function fire() {
    setState("idle");
    setMsg(null);
    const res = await fetch("/api/test/fire-incident", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const data = (await res.json().catch(() => ({}))) as {
      alertId?: string;
      supplier?: string;
      severity?: string;
      headline?: string;
      error?: string;
    };
    if (!res.ok) {
      setState("err");
      setMsg(data.error ?? `${res.status}`);
      setTimeout(() => setState("idle"), 4500);
      return;
    }
    setState("ok");
    setMsg(`${data.severity}, ${data.supplier}`);
    startTransition(() => router.refresh());
    if (redirect && data.alertId) {
      setTimeout(() => router.push(`/?alert=${data.alertId}#${data.alertId}`), 600);
    }
    setTimeout(() => setState("idle"), 3000);
  }

  return (
    <div className="flex items-center gap-3">
      {msg && state !== "idle" && (
        <span className={cn("max-w-xs truncate text-xs", state === "ok" ? "text-ink-soft" : "text-negative")}>
          {msg}
        </span>
      )}
      <button
        type="button"
        onClick={fire}
        disabled={pending || state !== "idle"}
        className={cn("btn h-7 px-3 text-xs", variant === "primary" ? "btn-primary" : "btn-secondary")}
        title="Fire a synthetic high-severity alert"
      >
        {state === "ok" ? (
          <Check className="h-3.5 w-3.5" aria-hidden />
        ) : state === "err" ? (
          <X className="h-3.5 w-3.5" aria-hidden />
        ) : pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Zap className="h-3.5 w-3.5" aria-hidden />
        )}
        {state === "ok"
          ? "Alert fired"
          : state === "err"
            ? "Could not fire"
            : pending
              ? "Firing"
              : "Simulate an alert"}
      </button>
    </div>
  );
}
