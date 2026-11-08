export const SEVERITY_COLOR: Record<string, string> = {
  low: "#f2f2f3",
  medium: "#d9a441",
  high: "#ef7d4a",
  critical: "#e5566f",
};

// Rerouted is blue because it is Eureka's own move; everything else is white,
// grey or a risk hue.
export const LANE_COLOR: Record<string, string> = {
  "on-track": "rgba(242,242,243,0.55)",
  delayed: "#d9a441",
  rerouted: "#4a8ad6",
  held: "rgba(138,140,146,0.8)",
  arrived: "rgba(242,242,243,0.2)",
};
