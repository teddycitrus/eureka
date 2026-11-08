"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, Check } from "lucide-react";
import { Window } from "@/components/window";
import { cn } from "@/lib/utils";

type Supplier = { id: string; name: string; country: string };

export function ContactForm({ suppliers }: { suppliers: Supplier[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("+1");
  const [email, setEmail] = useState("");
  const [escalation, setEscalation] = useState(1);
  const [receiveCalls, setReceiveCalls] = useState(true);
  const [supplierIds, setSupplierIds] = useState<string[]>([]);

  // Initial position is computed on first open so we have viewport dims.
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | null>(null);
  const openedRef = useRef(false);
  useEffect(() => {
    if (open && !openedRef.current) {
      const W = 560;
      const H = 560;
      setInitialPos({
        x: Math.max(16, Math.floor(window.innerWidth / 2 - W / 2)),
        y: Math.max(16, Math.floor(window.innerHeight / 2 - H / 2)),
      });
      openedRef.current = true;
    }
    if (!open) openedRef.current = false;
  }, [open]);

  function reset() {
    setName("");
    setRole("");
    setPhone("+1");
    setEmail("");
    setEscalation(1);
    setReceiveCalls(true);
    setSupplierIds([]);
    setError(null);
    setDone(false);
    setInitialPos(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\+\d{6,15}$/.test(phone)) {
      setError("Enter the phone number with its country code, for example +14155551234.");
      return;
    }

    const body = {
      name: name.trim(),
      role: role.trim(),
      phone: phone.trim(),
      email: email.trim() ? email.trim() : undefined,
      escalation,
      receiveCalls,
      supplierIds,
    };

    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: unknown };
      setError(typeof data.error === "string" ? data.error : "The person could not be added.");
      return;
    }

    setDone(true);
    startTransition(() => router.refresh());
    setTimeout(() => {
      reset();
      setOpen(false);
    }, 800);
  }

  function toggleSupplier(id: string) {
    setSupplierIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function close() {
    if (pending) return;
    reset();
    setOpen(false);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary h-7 px-3 text-xs">
        <UserPlus className="h-3.5 w-3.5" aria-hidden />
        Add person
      </button>

      {open && initialPos && (
        <div className="pointer-events-none fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Add to the call tree">
          <div className="pointer-events-auto absolute inset-0 bg-black/60" onClick={close} />
          <Window
            title="Add to the call tree"
            defaultPos={initialPos}
            defaultSize={{
              width: Math.min(560, window.innerWidth - 32),
              height: Math.min(560, window.innerHeight - 32),
            }}
            minSize={{ width: Math.min(360, window.innerWidth - 32), height: 240 }}
            zIndex={60}
            bounds="parent"
            onClose={close}
            dialog
            className="pointer-events-auto"
          >
            <form onSubmit={submit} className="flex h-full flex-col overflow-y-auto px-5 py-4">
              <p className="text-sm text-ink-soft">
                Eureka calls this person when a medium or worse alert reaches one of their suppliers.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Name" required>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Priya Anand"
                    className={inputClass}
                  />
                </Field>
                <Field label="Role" required>
                  <input
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="VP Operations"
                    className={inputClass}
                  />
                </Field>
                <Field label="Phone" required hint="With country code">
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+14155551234"
                    className={cn(inputClass, "tabular-nums")}
                  />
                </Field>
                <Field label="Email" hint="Optional">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya@company.com"
                    className={inputClass}
                  />
                </Field>
                <Field label="Escalation level" hint="1 is called first">
                  <select
                    value={escalation}
                    onChange={(e) => setEscalation(Number(e.target.value))}
                    className={inputClass}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        Level {n}
                      </option>
                    ))}
                  </select>
                </Field>
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={receiveCalls}
                    onChange={(e) => setReceiveCalls(e.target.checked)}
                    className="h-4 w-4 accent-[rgb(var(--accent))]"
                  />
                  Eureka may call this person
                </label>
              </div>

              <fieldset className="mt-5">
                <legend className="text-xs font-medium text-ink">Suppliers they answer for</legend>
                {suppliers.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-soft">
                    No suppliers yet. Add some through the API first.
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suppliers.map((s) => {
                      const on = supplierIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleSupplier(s.id)}
                          className={cn(
                            "btn h-7 px-3 text-xs",
                            on
                              ? "bg-ink text-surface"
                              : "border border-control text-ink-soft hover:border-ink-muted hover:text-ink",
                          )}
                        >
                          {s.name}
                          <span className={on ? "text-surface/70" : "text-ink-muted"}>{s.country}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </fieldset>

              {error && <p className="mt-4 text-sm text-negative">{error}</p>}

              <div className="mt-auto flex items-center justify-end gap-2 pt-5">
                <button type="button" onClick={close} className="btn btn-text">
                  Cancel
                </button>
                <button type="submit" disabled={pending || done} className="btn btn-primary">
                  {done ? (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  ) : pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : null}
                  {done ? "Added" : pending ? "Adding" : "Add to call tree"}
                </button>
              </div>
            </form>
          </Window>
        </div>
      )}
    </>
  );
}

const inputClass = "field";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs">
        <span className="font-medium text-ink">{label}</span>
        {required && <span className="sr-only"> (required)</span>}
        {hint && <span className="ml-2 text-ink-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
