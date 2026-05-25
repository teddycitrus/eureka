import { PrismaClient } from "@prisma/client";

/**
 * When TURSO_* env vars are set we go through the libSQL adapter so the
 * seed lands in Turso. Otherwise this is just a vanilla local Prisma
 * client writing to file:./dev.db.
 */
function buildDb(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (tursoUrl && tursoToken) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@libsql/client") as {
      createClient: (cfg: { url: string; authToken: string }) => unknown;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require("@prisma/adapter-libsql") as {
      PrismaLibSQL: new (client: unknown) => unknown;
    };
    const libsql = createClient({ url: tursoUrl, authToken: tursoToken });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter: adapter as never } as never);
  }
  return new PrismaClient();
}

const db = buildDb();

async function main() {
  await db.call.deleteMany();
  await db.shipment.deleteMany();
  await db.alert.deleteMany();
  await db.contactOnSupplier.deleteMany();
  await db.newsItem.deleteMany();
  await db.contact.deleteMany();
  await db.supplier.deleteMany();

  const suppliers = await Promise.all([
    db.supplier.create({
      data: {
        name: "Hsinchu Semiconductor Foundry",
        region: "East Asia",
        country: "Taiwan",
        categories: JSON.stringify(["semiconductors", "logic-ic"]),
        tier: 1,
        riskLevel: "high",
        latitude: 24.8138,
        longitude: 120.9676,
        notes: "Tier-1 fab — single source for 5nm SoC.",
      },
    }),
    db.supplier.create({
      data: {
        name: "Rotterdam Logistics Hub",
        region: "Western Europe",
        country: "Netherlands",
        categories: JSON.stringify(["logistics", "shipping", "ports"]),
        tier: 1,
        riskLevel: "medium",
        latitude: 51.9244,
        longitude: 4.4777,
        notes: "Primary EU import gateway.",
      },
    }),
    db.supplier.create({
      data: {
        name: "Hai Phong Assembly Co.",
        region: "Southeast Asia",
        country: "Vietnam",
        categories: JSON.stringify(["assembly", "electronics"]),
        tier: 2,
        riskLevel: "medium",
        latitude: 20.8449,
        longitude: 106.6881,
      },
    }),
    db.supplier.create({
      data: {
        name: "Atacama Lithium Mining",
        region: "South America",
        country: "Chile",
        categories: JSON.stringify(["raw-materials", "lithium", "battery"]),
        tier: 2,
        riskLevel: "high",
        latitude: -23.5,
        longitude: -68.9,
      },
    }),
  ]);

  const contacts = await Promise.all([
    db.contact.create({
      data: {
        name: "Priya Anand",
        role: "VP Operations",
        phone: "+15555550101",
        email: "priya@example.com",
        escalation: 1,
      },
    }),
    db.contact.create({
      data: {
        name: "Marcus Chen",
        role: "Procurement Lead",
        phone: "+15555550102",
        email: "marcus@example.com",
        escalation: 2,
      },
    }),
    db.contact.create({
      data: {
        name: "Sofia Reyes",
        role: "Logistics Manager",
        phone: "+15555550103",
        email: "sofia@example.com",
        escalation: 1,
      },
    }),
  ]);

  const links: Array<{ contactId: string; supplierId: string }> = [
    { contactId: contacts[0].id, supplierId: suppliers[0].id },
    { contactId: contacts[0].id, supplierId: suppliers[3].id },
    { contactId: contacts[1].id, supplierId: suppliers[0].id },
    { contactId: contacts[1].id, supplierId: suppliers[2].id },
    { contactId: contacts[2].id, supplierId: suppliers[1].id },
    { contactId: contacts[2].id, supplierId: suppliers[2].id },
  ];
  for (const l of links) await db.contactOnSupplier.create({ data: l });

  const news1 = await db.newsItem.create({
    data: {
      title: "Typhoon Hagibis disrupts shipping lanes off Taiwan strait",
      summary:
        "Major shipping carriers reroute around Taiwan strait following Cat-4 typhoon. Hsinchu industrial park reports 36-hour production halt at multiple fabs.",
      url: "https://example.com/news/typhoon-hagibis-taiwan",
      source: "Reuters",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
      region: "East Asia",
      topics: JSON.stringify(["weather", "shipping", "semiconductors"]),
      riskScore: 0.84,
    },
  });

  const news2 = await db.newsItem.create({
    data: {
      title: "Chilean miners union announces 7-day strike at Atacama operations",
      summary:
        "SQM and Albemarle facilities affected. Union demands 12% wage increase. Lithium spot prices climb 4% on the news.",
      url: "https://example.com/news/chile-lithium-strike",
      source: "Bloomberg",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 14),
      region: "South America",
      topics: JSON.stringify(["labor", "lithium", "battery"]),
      riskScore: 0.71,
    },
  });

  const news3 = await db.newsItem.create({
    data: {
      title: "Rotterdam port operators flag 4-day go-slow over automation dispute",
      summary:
        "FNV union representatives confirm reduced crane throughput at Maasvlakte II terminal from Monday. Carriers warn EU-bound containers face 3-5 day cascade delays into next week's bookings.",
      url: "https://example.com/news/rotterdam-port-goslow",
      source: "Financial Times",
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
      region: "Western Europe",
      topics: JSON.stringify(["labor", "ports", "shipping"]),
      riskScore: 0.58,
    },
  });

  const alert1 = await db.alert.create({
    data: {
      newsId: news1.id,
      supplierId: suppliers[0].id,
      severity: "high",
      status: "pending",
      recommendation:
        "Confirm wafer-out impact for next-week orders. Consider activating secondary fab in Singapore for 7nm allocations.",
    },
  });

  await db.alert.create({
    data: {
      newsId: news2.id,
      supplierId: suppliers[3].id,
      severity: "medium",
      status: "pending",
      recommendation:
        "Validate inventory cover (current: 18 days). Freeze new battery PO commitments until strike resolves.",
    },
  });

  await db.alert.create({
    data: {
      newsId: news3.id,
      supplierId: suppliers[1].id,
      severity: "medium",
      status: "pending",
      recommendation:
        "Re-route time-critical inbound through Antwerp or Hamburg and notify customer-success of expected 3–5 day delivery slippage.",
    },
  });

  // Demo shipments — coords picked so arcs draw nicely on the globe
  const shipments = [
    {
      ref: "PO-9821-TW",
      mode: "ocean",
      status: "rerouted",
      originLabel: "Kaohsiung, TW",
      originLat: 22.6273,
      originLng: 120.3014,
      destLabel: "Long Beach, US",
      destLat: 33.7701,
      destLng: -118.1937,
      waypoints: JSON.stringify([[35.0, 145.0]]),
      valueUSD: 4_200_000,
      etaAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12),
      supplierId: suppliers[0].id,
      alertId: alert1.id,
    },
    {
      ref: "PO-7732-NL",
      mode: "ocean",
      status: "on-track",
      originLabel: "Singapore",
      originLat: 1.3521,
      originLng: 103.8198,
      destLabel: "Rotterdam, NL",
      destLat: 51.9244,
      destLng: 4.4777,
      waypoints: JSON.stringify([
        [12.6, 43.4],
        [30.0, 32.5],
        [36.0, 14.5],
      ]),
      valueUSD: 2_750_000,
      etaAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18),
      supplierId: suppliers[1].id,
    },
    {
      ref: "PO-4410-CL",
      mode: "ocean",
      status: "delayed",
      originLabel: "Antofagasta, CL",
      originLat: -23.65,
      originLng: -70.4,
      destLabel: "Yokohama, JP",
      destLat: 35.4437,
      destLng: 139.638,
      waypoints: JSON.stringify([]),
      valueUSD: 1_900_000,
      etaAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 22),
      supplierId: suppliers[3].id,
    },
    {
      ref: "AIR-1187-VN",
      mode: "air",
      status: "on-track",
      originLabel: "Hai Phong, VN",
      originLat: 20.8449,
      originLng: 106.6881,
      destLabel: "Frankfurt, DE",
      destLat: 50.0379,
      destLng: 8.5622,
      waypoints: JSON.stringify([]),
      valueUSD: 880_000,
      etaAt: new Date(Date.now() + 1000 * 60 * 60 * 36),
      supplierId: suppliers[2].id,
    },
  ];
  for (const s of shipments) await db.shipment.create({ data: s });

  console.log("Seeded:", {
    suppliers: suppliers.length,
    contacts: contacts.length,
    news: 3,
    alerts: 3,
    shipments: shipments.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
