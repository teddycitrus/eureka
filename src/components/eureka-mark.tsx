import { cn } from "@/lib/utils";

/**
 * Brand mark: a globe seen edge-on with one point found on it.
 */
export function EurekaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("h-6 w-6", className)}>
      <circle cx="12" cy="12" r="9.25" stroke="rgb(var(--text))" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="4" ry="9.25" stroke="rgb(var(--text))" strokeWidth="1.5" />
      <circle cx="17.6" cy="7.6" r="3" fill="rgb(var(--accent))" stroke="rgb(var(--ground))" strokeWidth="1.5" />
    </svg>
  );
}

export function EurekaWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <EurekaMark />
      <span className="text-base font-semibold text-ink">Eureka</span>
    </span>
  );
}
