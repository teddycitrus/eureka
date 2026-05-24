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
      const W = 600;
      const H = 580;
      setInitialPos({
        x: Math.max(20, Math.floor(window.innerWidth / 2 - W / 2)),
        y: Math.max(20, Math.floor(window.innerHeight / 2 - H / 2)),
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
      setError("phone must be E.164 (e.g. +14155551234)");
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
      setError(typeof data.error === "string" ? data.error : "create failed");
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
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 border border-amber/60 bg-amber/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-chart text-amber transition-colors hover:bg-amber/25 hover:border-amber"
      >
        <UserPlus className="h-3 w-3" />
        new contact
      </button>

      {open && initialPos && (
        <div className="pointer-events-none fixed inset-0 z-50">
          <Window
            title="new contact"
            defaultPos={initialPos}
            defaultSize={{ width: 600, height: 580 }}
            minSize={{ width: 380, height: 240 }}
            zIndex={60}
            bounds="parent"
            onClose={close}
            className="pointer-events-auto shadow-instrument"
          >
            <form
              onSubmit={submit}
              className="flex h-full flex-col overflow-y-auto px-6 pb-5 pt-4"
            >
              <div>
                <span className="label">station · contact registry</span>
                <h3 className="mt-1 font-display text-lg italic text-ink-warm">
                  add a human to the call tree
                </h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
                  Eureka will dial them when an alert ≥ medium hits a mapped supplier.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
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
                <Field label="Phone (E.164)" required hint="incl. country code">
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+14155551234"
                    className={cn(inputClass, "font-mono")}
                  />
                </Field>
                <Field label="Email" hint="optional">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya@company.com"
                    className={inputClass}
                  />
                </Field>
                <Field label="Escalation tier" hint="1 = first responder">
                  <select
                    value={escalation}
                    onChange={(e) => setEscalation(Number(e.target.value))}
                    className={inputClass}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        L{n}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Voice ops">
                  <label className="flex h-9 items-center gap-2 border border-line bg-bg-raised/60 px-3 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={receiveCalls}
                      onChange={(e) => setReceiveCalls(e.target.checked)}
                      className="h-3.5 w-3.5 accent-amber"
                    />
                    <span className="font-mono text-[10px] uppercase tracking-chart">
                      dialable by eureka
                    </span>
                  </label>
                </Field>
              </div>

              <div className="mt-5">
                <span className="label">assign suppliers</span>
                {suppliers.length === 0 ? (
                  <p className="mt-2 text-xs text-ink-muted">
                    No suppliers yet — add some via the API first.
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {suppliers.map((s) => {
                      const on = supplierIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSupplier(s.id)}
                          className={cn(
                            "border-l px-2 py-1 font-mono text-[10px] uppercase tracking-chart transition-colors",
                            on
                              ? "border-amber bg-amber/15 text-amber"
                              : "border-line bg-bg-raised/40 text-ink-muted hover:border-amber/40 hover:text-ink",
                          )}
                        >
                          {s.name}
                          <span className="ml-1.5 text-ink-dim">{s.country}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {error && (
                <p className="mt-4 border-l-2 border-risk-critical bg-risk-critical/10 px-3 py-2 font-mono text-[10px] uppercase tracking-chart text-risk-critical">
                  {error}
                </p>
              )}

              <div className="mt-auto flex items-center justify-end gap-2 pt-5">
                <button
                  type="button"
                  onClick={close}
                  className="border border-line bg-bg-raised/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-chart text-ink-muted hover:text-ink"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={pending || done}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-chart transition-colors",
                    done
                      ? "border border-risk-low/60 bg-risk-low/15 text-risk-low"
                      : "border border-amber/60 bg-amber/15 text-amber hover:bg-amber/25 hover:border-amber disabled:opacity-50",
                  )}
                >
                  {done ? (
                    <Check className="h-3 w-3" />
                  ) : pending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  {done ? "saved" : pending ? "saving" : "create contact"}
                </button>
              </div>
            </form>
          </Window>
        </div>
      )}
    </>
  );
}

const inputClass =
  "h-9 w-full border border-line bg-bg-raised/60 px-3 text-[12px] text-ink placeholder:text-ink-dim focus:border-amber/60 focus:outline-none focus:ring-1 focus:ring-amber/40";

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
      <span className="label">
        {label}
        {required && <span className="ml-1 text-amber normal-case">*</span>}
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
