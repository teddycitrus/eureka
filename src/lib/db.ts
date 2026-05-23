import { PrismaClient } from "@prisma/client";

/**
 * Prisma client.
 *
 * Local dev → DATABASE_URL=file:./dev.db (default). Prisma talks to SQLite
 * directly.
 *
 * Serverless prod → TURSO_DATABASE_URL + TURSO_AUTH_TOKEN. We go through
 * the libSQL driver adapter so a remote Turso instance is the backing
 * store. Same schema, same queries.
 *
 * The adapter is loaded lazily so a fresh dev install without
 * @libsql/client still boots — `require` only fires when Turso env vars
 * are present.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function buildClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoToken) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require("@prisma/adapter-libsql") as {
      PrismaLibSQL: new (cfg: { url: string; authToken: string }) => unknown;
    };
    const adapter = new PrismaLibSQL({ url: tursoUrl, authToken: tursoToken });
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
