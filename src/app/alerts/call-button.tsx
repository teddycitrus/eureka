"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Loader2, Check } from "lucide-react";

export function CallButton({
  alertId,
  contactName,
}: {
  alertId: string;
  contactName: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "calling" | "ok" | "err">("idle");
  const [error, setError] = useState<string | null>(null);
  const first = contactName.split(" ")[0];

  async function dial() {
    setState("calling");
    setError(null);
    try {
      const r = await fetch("/api/calls/initiate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      if (!r.ok) {
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Call failed (${r.status})`);
      }
      setState("ok");
      router.refresh();
      setTimeout(() => setState("idle"), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Call failed");
      setState("err");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={dial}
        disabled={state === "calling"}
        className="btn btn-primary h-7 px-3 text-xs"
        title={`Brief ${contactName} by phone`}
      >
        {state === "calling" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : state === "ok" ? (
          <Check className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Phone className="h-3.5 w-3.5" aria-hidden />
        )}
        {state === "calling" ? "Dialling" : state === "ok" ? "Call placed" : `Call ${first}`}
      </button>
      {state === "err" && error && <span className="text-xs text-negative">{error}</span>}
    </span>
  );
}
