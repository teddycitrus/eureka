import { PrismaClient } from "@prisma/client";

/**
 * Prisma client.
 *
 * Local dev → DATABASE_URL=file:./dev.db (default). Prisma talks to SQLite
 * directly.
 *
 * Serverless prod → TURSO_DATABASE_URL + TURSO_AUTH_TOKEN. We construct a
 * libSQL Client and hand it to PrismaLibSQL so Prisma queries route to
 * a remote Turso instance. Same schema, same queries.
 *
 * Adapter + libsql client are loaded lazily so a fresh dev install without
 * those packages still boots — `require` only fires when Turso env vars
 * are present.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function buildClient(): PrismaClient {
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
    return new PrismaClient({
      adapter: adapter as never,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    } as never);
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
