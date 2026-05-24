import { cn } from "@/lib/utils";

/**
 * Brand mark — an iris over a horizon.
 * Pupil is a fixed point; the surrounding rings imply a concentric
 * isobar/weather-chart pattern, fitting the supply-chain ops theme.
 */
export function EurekaMark({
  className,
  animate = true,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={cn("h-7 w-7", animate && "eureka-breath", className)}
    >
      <defs>
        <radialGradient id="eurekaIris" cx="50%" cy="48%" r="60%">
          <stop offset="0%" stopColor="rgb(255 213 152)" />
          <stop offset="55%" stopColor="rgb(240 158 56)" />
          <stop offset="100%" stopColor="rgb(76 43 8)" />
        </radialGradient>
      </defs>
      {/* horizon */}
      <line
        x1="3"
        y1="20"
        x2="37"
        y2="20"
        stroke="rgb(230 223 200)"
        strokeOpacity="0.18"
        strokeWidth="0.6"
      />
      {/* outer almond — eye shape */}
      <path
        d="M3 20 Q 20 7 37 20 Q 20 33 3 20 Z"
        stroke="rgb(255 213 152)"
        strokeOpacity="0.55"
        strokeWidth="0.9"
      />
      {/* iris */}
      <circle cx="20" cy="20" r="8.5" fill="url(#eurekaIris)" />
      {/* concentric isobars over iris */}
      <circle
        cx="20"
        cy="20"
        r="6"
        fill="none"
        stroke="rgb(230 223 200)"
        strokeOpacity="0.15"
        strokeWidth="0.4"
      />
      <circle
        cx="20"
        cy="20"
        r="4"
        fill="none"
        stroke="rgb(230 223 200)"
        strokeOpacity="0.2"
        strokeWidth="0.4"
      />
      {/* pupil */}
      <circle cx="20" cy="20" r="2.6" fill="rgb(6 9 14)" />
      {/* catch-light */}
      <circle cx="22.2" cy="17.8" r="0.9" fill="rgb(230 223 200)" />
    </svg>
  );
}

export function EurekaWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-baseline gap-2.5", className)}>
      <EurekaMark className="self-center" />
      <span className="font-display text-[22px] font-medium leading-none tracking-tight text-ink">
        eureka
        <span className="text-amber">.</span>
      </span>
    </div>
  );
}
