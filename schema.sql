CREATE TABLE "Supplier"(
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "categories" TEXT NOT NULL,
  "tier" INTEGER NOT NULL DEFAULT 1,
  "riskLevel" TEXT NOT NULL DEFAULT 'low',
  "latitude" REAL,
  "longitude" REAL,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "Shipment"(
  "id" TEXT NOT NULL PRIMARY KEY,
  "ref" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'ocean',
  "status" TEXT NOT NULL DEFAULT 'on-track',
  "originLabel" TEXT NOT NULL,
  "originLat" REAL NOT NULL,
  "originLng" REAL NOT NULL,
  "destLabel" TEXT NOT NULL,
  "destLat" REAL NOT NULL,
  "destLng" REAL NOT NULL,
  "waypoints" TEXT NOT NULL DEFAULT '[]',
  "valueUSD" REAL,
  "etaAt" DATETIME,
  "supplierId" TEXT,
  "alertId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Shipment_supplierId_fkey" FOREIGN KEY("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Shipment_alertId_fkey" FOREIGN KEY("alertId") REFERENCES "Alert"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "Contact"(
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "receiveCalls" BOOLEAN NOT NULL DEFAULT true,
  "escalation" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "ContactOnSupplier"(
  "contactId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  PRIMARY KEY("contactId", "supplierId"),
  CONSTRAINT "ContactOnSupplier_contactId_fkey" FOREIGN KEY("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContactOnSupplier_supplierId_fkey" FOREIGN KEY("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "NewsItem"(
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "publishedAt" DATETIME NOT NULL,
  "region" TEXT,
  "topics" TEXT NOT NULL,
  "riskScore" REAL NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Alert"(
  "id" TEXT NOT NULL PRIMARY KEY,
  "newsId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "recommendation" TEXT NOT NULL,
  "decision" TEXT,
  "decisionMaker" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Alert_newsId_fkey" FOREIGN KEY("newsId") REFERENCES "NewsItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Alert_supplierId_fkey" FOREIGN KEY("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Call"(
  "id" TEXT NOT NULL PRIMARY KEY,
  "alertId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "vapiCallId" TEXT,
  "twilioSid" TEXT,
  "status" TEXT NOT NULL DEFAULT 'initiated',
  "outcome" TEXT,
  "transcript" TEXT,
  "durationSec" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" DATETIME,
  CONSTRAINT "Call_alertId_fkey" FOREIGN KEY("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Call_contactId_fkey" FOREIGN KEY("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "NewsItem_url_key" ON "NewsItem"("url");
