import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseList<T = string>(json: string | null | undefined): T[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function severityFromScore(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 0.85) return "critical";
  if (score >= 0.65) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

export function shortRelTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function severityRank(s: string): number {
  return SEVERITY_RANK[s] ?? 9;
}

export function bySeverity<T extends { severity: string; createdAt: string | Date }>(a: T, b: T) {
  const r = severityRank(a.severity) - severityRank(b.severity);
  return r !== 0 ? r : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}
