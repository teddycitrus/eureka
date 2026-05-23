import { z } from "zod";
import { db } from "@/lib/db";
import { parseList } from "@/lib/utils";
import { bus } from "@/lib/events";
import { dispatchCallsForAlert } from "@/lib/dispatch";
import { guard, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const input = z.object({
  supplierId: z.string().min(1).max(64).optional(),
  severity: z.enum(["high", "critical"]).optional(),
});

/**
 * POST /api/test/fire-incident
 * Create a synthetic high-severity alert for testing the voice-call flow.
 * Always admin-gated — this places outbound voice calls.
 */
export const POST = guard({
  body: input,
  requireOrigin: true,
  requireAdmin: true,
  rateLimit: { bucket: "test:fire", windowSec: 60, max: 10 },
  handler: async ({ body }) => {
    const candidates = await db.supplier.findMany({
      where: body.supplierId
        ? { id: body.supplierId }
        : { contacts: { some: { contact: { receiveCalls: true } } } },
      include: { contacts: { include: { contact: true } } },
    });

    if (candidates.length === 0) {
      return ok(
        {
          error:
            "no supplier with a callable contact found — add a contact in /contacts and map it to a supplier first",
        },
        { status: 400 },
      );
    }

    const supplier = candidates[Math.floor(Math.random() * candidates.length)];
    const cats = parseList<string>(supplier.categories);
    const scenario = pickScenario(supplier.country, supplier.region, cats);
    const severity = body.severity ?? (Math.random() < 0.35 ? "critical" : "high");

    const news = await db.newsItem.create({
      data: {
        title: scenario.title,
        summary: scenario.summary,
        url: `https://test.iris.local/incident/${Date.now()}`,
        source: "Iris Test Harness",
        publishedAt: new Date(),
        region: supplier.region,
        topics: JSON.stringify(scenario.topics),
        riskScore: severity === "critical" ? 0.92 : 0.78,
      },
    });

    const alert = await db.alert.create({
      data: {
        newsId: news.id,
        supplierId: supplier.id,
        severity,
        status: "pending",
        recommendation: scenario.recommendation,
      },
      include: { news: true, supplier: true },
    });

    bus.emit({
      type: "alert.created",
      alertId: alert.id,
      supplierId: supplier.id,
      severity,
    });

    const dispatch = await dispatchCallsForAlert(alert.id);

    return ok({
      ok: true,
      alertId: alert.id,
      supplier: supplier.name,
      severity,
      headline: scenario.title,
      dispatch,
    });
  },
});

type Scenario = {
  title: string;
  summary: string;
  topics: string[];
  recommendation: string;
};

function pickScenario(country: string, region: string, cats: string[]): Scenario {
  const isSemi = cats.some((c) => /semi|chip|wafer|logic|fab/i.test(c));
  const isLogistics = cats.some((c) => /logistic|shipping|port|freight/i.test(c));
  const isBattery = cats.some((c) => /lithium|battery|cell/i.test(c));

  const pool: Scenario[] = [
    {
      title: `Magnitude 6.4 earthquake near ${country} industrial corridor — multiple plants pause operations`,
      summary: `Initial reports indicate at least four manufacturing facilities in the ${region} corridor have triggered seismic shutdown protocols. No casualties reported. Aftershocks expected over the next 24 hours; damage assessment teams en route.`,
      topics: ["earthquake", "shutdown", "manufacturing"],
      recommendation:
        "Confirm whether our line was affected and pause new POs for 48 hours. Activate secondary source if downtime exceeds 12 hours.",
    },
    {
      title: `Wildcat strike at primary ${country} gateway — port operations at standstill`,
      summary: `Dockworker union members walked off the job at 06:00 local time over a contract dispute. No timeline for resolution. Vessels at anchorage growing; expect 5–9 day cascade delays into next week's bookings.`,
      topics: ["labor", "shipping", "ports"],
      recommendation:
        "Reroute time-critical inbound through the alternate port and notify the customer success team of expected delivery slippage.",
    },
    {
      title: `Cyberattack disclosed at ${country}-based manufacturing partner — production systems offline`,
      summary: `Ransomware group claims responsibility. Affected partner has isolated networks; ETA on restoration is unknown but estimated 48–96 hours. Investigators are validating whether customer data was exfiltrated.`,
      topics: ["cyber", "shutdown", "disclosure"],
      recommendation:
        "Halt outbound data flows, verify our integration credentials weren't on the partner's affected systems, and prepare a holding statement.",
    },
    {
      title: `New export-control regulation announced — ${region} suppliers face 30-day compliance window`,
      summary: `Updated dual-use rules tighten licensing requirements on several component categories. Industry groups warn of compliance bottlenecks; first license decisions not expected for 6–8 weeks.`,
      topics: ["regulatory", "tariff", "export-control"],
      recommendation:
        "Front-load the next 60 days of inbound orders and engage trade counsel on whether our SKUs fall under the new schedule.",
    },
  ];

  if (isSemi) {
    pool.push({
      title: `Power outage at major ${country} foundry forces wafer scrap, multiple lines impacted`,
      summary: `A grid disturbance caused unscheduled tool drops across at least two fabs. Operator confirms wafer-out impact for the affected lots. Recovery ETA 36–72 hours; downstream allocations under review.`,
      topics: ["semiconductors", "outage", "wafer-scrap"],
      recommendation:
        "Verify our wafer lots were in the affected windows and pull forward Singapore allocation for next-week ramp.",
    });
  }
  if (isLogistics) {
    pool.push({
      title: `Major carrier suspends ${region} sailings after maritime security incident`,
      summary: `A top-3 ocean carrier has paused new bookings on the affected lane. Spot rates are up 18% in the past 24 hours. Re-routing options exist but add 9–12 days transit.`,
      topics: ["shipping", "rerouting", "rates"],
      recommendation:
        "Confirm whether our in-transit containers are with this carrier and reprice the alternative routings before the spot market moves further.",
    });
  }
  if (isBattery) {
    pool.push({
      title: `Lithium spot price spikes 9% on ${country} mining halt — battery cell costs to follow`,
      summary: `Operations were suspended pending an environmental review. Analysts expect 2–4 weeks before resumption; cell makers begin pre-buying alternative supply.`,
      topics: ["lithium", "battery", "raw-materials"],
      recommendation:
        "Lock in next quarter's cell pricing today and check whether our LTAs have force-majeure exposure.",
    });
  }

  return pool[Math.floor(Math.random() * pool.length)];
}
