"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  Building2,
  Users,
  PhoneCall,
  Siren,
  Settings,
  Globe2,
} from "lucide-react";
import { EurekaWordmark } from "./eureka-mark";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Lane map", icon: Globe2 },
  { href: "/alerts", label: "Alerts", icon: Siren },
  { href: "/news", label: "Signals", icon: Newspaper },
  { href: "/suppliers", label: "Suppliers", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/calls", label: "Voice ops", icon: PhoneCall },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line/60 bg-bg-raised/40 px-4 py-6 lg:flex">
      <Link href="/" className="px-2">
        <EurekaWordmark />
      </Link>
      <p className="mt-1 px-2 text-[11px] uppercase tracking-[0.18em] text-ink-dim">
        supply intelligence
      </p>

      <nav className="mt-8 flex flex-col gap-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-eureka-700/30 text-ink shadow-[inset_0_0_0_1px_rgba(168,131,255,0.25)]"
                  : "text-ink-muted hover:bg-bg-hover hover:text-ink",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  active ? "text-eureka-300" : "text-ink-dim group-hover:text-eureka-300",
                )}
              />
              <span>{label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-eureka-300" />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-line/70 bg-bg-card/60 p-3 text-xs text-ink-muted">
        <div className="flex items-center gap-2">
          <Settings className="h-3.5 w-3.5" />
          <span className="font-medium text-ink">Voice ops armed</span>
        </div>
        <p className="mt-1.5 leading-relaxed">
          Eureka will dial on-call contacts when alert severity ≥ <span className="text-eureka-200">high</span>.
        </p>
      </div>
    </aside>
  );
}
