"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeleteContactButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  async function handleDelete() {
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) startTransition(() => router.refresh());
    setConfirm(false);
  }

  return (
    <button
      type="button"
      onClick={() => (confirm ? handleDelete() : setConfirm(true))}
      onBlur={() => setConfirm(false)}
      disabled={pending}
      title={confirm ? `Click again to remove ${name}` : `Remove ${name}`}
      aria-label={confirm ? `Confirm removing ${name}` : `Remove ${name}`}
      className={cn(
        "btn h-7 shrink-0 px-2 text-xs",
        confirm ? "bg-negative/15 px-3 text-negative" : "text-ink-muted hover:bg-raised hover:text-negative",
      )}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : confirm ? (
        "Remove"
      ) : (
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  );
}
