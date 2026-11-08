import { cn } from "@/lib/utils";

const tone: Record<string, string> = {
  low: "text-risk-low",
  medium: "text-risk-medium",
  high: "text-risk-high",
  critical: "text-risk-critical",
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
    <span className={cn("text-xs font-semibold", tone[s] ?? tone.low, className)}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}
