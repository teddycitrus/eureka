import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "eureka",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: "eureka" | "cyan" | "rose" | "amber";
}) {
  const accents: Record<string, string> = {
    eureka: "from-eureka-500/30 to-eureka-700/0 text-eureka-200",
    cyan: "from-accent-cyan/30 to-accent-cyan/0 text-accent-cyan",
    rose: "from-accent-rose/30 to-accent-rose/0 text-accent-rose",
    amber: "from-accent-amber/30 to-accent-amber/0 text-accent-amber",
  };
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5">
      <div
        className={cn(
          "absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-radial blur-2xl",
          "bg-gradient-to-br",
          accents[accent],
        )}
      />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-ink-dim">
          <Icon className={cn("h-3.5 w-3.5", accents[accent].split(" ").pop())} />
          {label}
        </div>
        <div className="mt-3 font-display text-3xl text-ink">{value}</div>
        {hint && <div className="mt-1 text-xs text-ink-muted">{hint}</div>}
      </div>
    </div>
  );
}
