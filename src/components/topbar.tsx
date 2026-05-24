"use client";

import { Search, Activity } from "lucide-react";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line/60 px-8 py-5">
      <div>
        <h1 className="font-display text-2xl tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <label className="group relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-ink-dim group-focus-within:text-eureka-300" />
          <input
            type="search"
            placeholder="Search suppliers, signals, contacts…"
            className="h-9 w-72 rounded-lg border border-line bg-bg-raised/60 pl-9 pr-3 text-sm text-ink placeholder:text-ink-dim focus:border-eureka-500 focus:outline-none focus:ring-2 focus:ring-eureka-500/30"
          />
        </label>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-bg-raised/60 px-3 py-1.5 text-xs text-ink-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-accent-cyan opacity-75 pulse-ring" />
            <span className="relative h-2 w-2 rounded-full bg-accent-cyan" />
          </span>
          <Activity className="h-3.5 w-3.5 text-accent-cyan" />
          <span>live</span>
        </div>
      </div>
    </header>
  );
}
