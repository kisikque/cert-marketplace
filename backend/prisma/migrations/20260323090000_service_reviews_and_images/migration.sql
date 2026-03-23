-- RedefineTable
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProviderProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "inn" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "website" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "publicSlug" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verificationComment" TEXT,
    "submittedAt" DATETIME,
    "verifiedAt" DATETIME,
    "ratingAvg" REAL NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProviderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProviderProfile" ("address", "createdAt", "description", "id", "inn", "logoUrl", "orgName", "phone", "publicSlug", "submittedAt", "updatedAt", "userId", "verificationComment", "verificationStatus", "verifiedAt", "website")
SELECT "address", "createdAt", "description", "id", "inn", "logoUrl", "orgName", "phone", "publicSlug", "submittedAt", "updatedAt", "userId", "verificationComment", "verificationStatus", "verifiedAt", "website" FROM "ProviderProfile";
DROP TABLE "ProviderProfile";
ALTER TABLE "new_ProviderProfile" RENAME TO "ProviderProfile";
CREATE UNIQUE INDEX "ProviderProfile_userId_key" ON "ProviderProfile"("userId");
CREATE UNIQUE INDEX "ProviderProfile_publicSlug_key" ON "ProviderProfile"("publicSlug");

CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
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
INSERT INTO "new_Service" ("createdAt", "description", "etaDaysFrom", "id", "imageUrl", "internalCode", "isActive", "priceFrom", "providerId", "title", "updatedAt")
SELECT "createdAt", "description", "etaDaysFrom", "id", "imageUrl", "internalCode", "isActive", "priceFrom", "providerId", "title", "updatedAt" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
CREATE INDEX "Service_providerId_idx" ON "Service"("providerId");
CREATE UNIQUE INDEX "Service_providerId_internalCode_key" ON "Service"("providerId", "internalCode");

CREATE TABLE "ServiceReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "displayUserId" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceReview_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceReview_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceReview_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ServiceReview_orderItemId_key" ON "ServiceReview"("orderItemId");
CREATE INDEX "ServiceReview_serviceId_idx" ON "ServiceReview"("serviceId");
CREATE INDEX "ServiceReview_providerId_idx" ON "ServiceReview"("providerId");
CREATE INDEX "ServiceReview_customerId_idx" ON "ServiceReview"("customerId");
CREATE INDEX "ServiceReview_orderId_idx" ON "ServiceReview"("orderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
