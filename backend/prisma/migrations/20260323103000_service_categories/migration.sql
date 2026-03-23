-- RedefineTable
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'CONSULTING',
    "certificationKind" TEXT,
    "priceFrom" INTEGER,
    "etaDaysFrom" INTEGER,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ratingAvg" REAL NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Service_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Service" ("id", "providerId", "internalCode", "title", "description", "category", "certificationKind", "priceFrom", "etaDaysFrom", "imageUrl", "isActive", "ratingAvg", "ratingCount", "createdAt", "updatedAt")
SELECT
  "id",
  "providerId",
  "internalCode",
  "title",
  "description",
  CASE
    WHEN LOWER("title") LIKE '%сертифик%' OR LOWER("title") LIKE '%декларац%' THEN 'CERTIFICATION'
    WHEN LOWER("title") LIKE '%сопровожд%' THEN 'SUPPORT'
    ELSE 'CONSULTING'
  END,
  CASE
    WHEN LOWER("title") LIKE '%доброволь%' THEN 'VOLUNTARY'
    WHEN LOWER("title") LIKE '%сертифик%' OR LOWER("title") LIKE '%декларац%' THEN 'MANDATORY'
    ELSE NULL
  END,
  "priceFrom",
  "etaDaysFrom",
  "imageUrl",
  "isActive",
  "ratingAvg",
  "ratingCount",
  "createdAt",
  "updatedAt"
FROM "Service";

DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
CREATE INDEX "Service_providerId_idx" ON "Service"("providerId");
CREATE UNIQUE INDEX "Service_providerId_internalCode_key" ON "Service"("providerId", "internalCode");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
