import { env } from "./env";
import { parseList } from "./utils";

export type RiskAssessment = {
  riskScore: number; // 0..1
  topics: string[];
  region: string | null;
  affectedSupplierIds: string[];
  recommendation: string;
};

type SupplierContext = {
  id: string;
  name: string;
  region: string;
  country: string;
  categories: string; // JSON
};

/**
 * Score a news headline against the active supplier graph.
 * Falls back to a heuristic score if Gemini isn't configured.
 */
export async function assessRisk(
  news: { title: string; summary: string; source: string },
  suppliers: SupplierContext[],
): Promise<RiskAssessment> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("REPLACE_ME")) {
    return heuristic(news, suppliers);
  }

  const supplierBrief = suppliers
    .map(
      (s) =>
        `- ${s.id} | ${s.name} | ${s.country} (${s.region}) | categories: ${parseList<string>(
          s.categories,
        ).join(", ")}`,
    )
    .join("\n");

  const sys = `You are Eureka, a supply-chain risk analyst. Given a news item and a list of suppliers, return JSON with this exact shape:
{
  "riskScore": number 0..1,
  "topics": string[] (kebab-case tags like "shipping", "labor", "tariff", "weather"),
  "region": string | null (geo most affected),
  "affectedSupplierIds": string[] (ids from the list whose operations could plausibly be impacted),
  "recommendation": string (1-2 sentence next step for the on-call decision maker)
}
Only output valid JSON. No prose, no code fences.`;

  const user = `News:
title: ${news.title}
summary: ${news.summary}
source: ${news.source}

Suppliers:
${supplierBrief}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel()}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          maxOutputTokens: 800,
        },
      }),
    });

    if (!res.ok) {
      console.warn("gemini risk-score http", res.status, await res.text());
      return heuristic(news, suppliers);
    }
    const data = (await res.json()) as GeminiResponse;
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const json = extractJson(text);
    if (!json) return heuristic(news, suppliers);

    return {
      riskScore: clamp01(Number(json.riskScore ?? 0)),
      topics: Array.isArray(json.topics) ? json.topics.map(String) : [],
      region: typeof json.region === "string" ? json.region : null,
      affectedSupplierIds: Array.isArray(json.affectedSupplierIds)
        ? json.affectedSupplierIds.map(String)
        : [],
      recommendation: typeof json.recommendation === "string" ? json.recommendation : "",
    };
  } catch (err) {
    console.warn("gemini risk-score failed, using heuristic", err);
    return heuristic(news, suppliers);
  }
}

function heuristic(
  news: { title: string; summary: string },
  suppliers: SupplierContext[],
): RiskAssessment {
  const text = `${news.title} ${news.summary}`.toLowerCase();
  const triggers = [
    "strike",
    "typhoon",
    "earthquake",
    "tariff",
    "sanction",
    "shutdown",
    "shortage",
    "fire",
    "flood",
    "rerout",
    "drought",
    "embargo",
  ];
  const score = Math.min(
    1,
    triggers.reduce((acc, t) => (text.includes(t) ? acc + 0.2 : acc), 0.15),
  );
  const affected = suppliers.filter((s) => {
    const cats = parseList<string>(s.categories).join(" ").toLowerCase();
    return (
      text.includes(s.country.toLowerCase()) ||
      text.includes(s.region.toLowerCase()) ||
      cats.split(/\s+/).some((c) => c && text.includes(c))
    );
  });
  return {
    riskScore: score,
    topics: triggers.filter((t) => text.includes(t)),
    region: affected[0]?.region ?? null,
    affectedSupplierIds: affected.map((s) => s.id),
    recommendation:
      score >= 0.6
        ? "Confirm impact on inbound shipments and consider activating secondary source."
        : "Monitor and reassess in 12 hours.",
  };
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};
