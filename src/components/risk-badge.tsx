import { cn } from "@/lib/utils";

const tone: Record<string, string> = {
  low: "bg-risk-low",
  medium: "bg-risk-medium",
  high: "bg-risk-high",
  critical: "bg-risk-critical",
};

export function RiskBadge({
  severity,
  className,
}: {
  severity: string;
  className?: string;
}) {
  const s = severity.toLowerCase();
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-ink", className)}>
      <span className={cn("h-2 w-2 rounded-full", tone[s] ?? tone.low)} aria-hidden />
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}
