-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountKind" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "legalEntityType" TEXT,
    "fullName" TEXT,
    "companyName" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "inn" TEXT,
    "kpp" TEXT,
    "ogrn" TEXT,
    "position" TEXT,
    "esiaIntegrationNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerProfileId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "specs" TEXT,
    "categoryLabel" TEXT,
    "documentsLabel" TEXT DEFAULT 'Документы Товара/Услуги',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientProduct_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientProductDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientProductId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientProductDocument_clientProductId_fkey" FOREIGN KEY ("clientProductId") REFERENCES "ClientProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClientProductDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductCertificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientProductId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "certNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductCertificate_clientProductId_fkey" FOREIGN KEY ("clientProductId") REFERENCES "ClientProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductCertificate_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderEventLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderEventLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderEventLog_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "customerProfileId" TEXT,
    "clientProductId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "customerComment" TEXT,
    "providerComment" TEXT,
    "providerNeedsAttention" BOOLEAN NOT NULL DEFAULT false,
    "lastCustomerDataChangeAt" DATETIME,
    "lastCustomerDataChangeType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_clientProductId_fkey" FOREIGN KEY ("clientProductId") REFERENCES "ClientProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("createdAt", "customerComment", "customerId", "id", "providerComment", "providerId", "status", "updatedAt") SELECT "createdAt", "customerComment", "customerId", "id", "providerComment", "providerId", "status", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_providerId_idx" ON "Order"("providerId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_customerProfileId_idx" ON "Order"("customerProfileId");
CREATE INDEX "Order_clientProductId_idx" ON "Order"("clientProductId");
CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerId" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
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
INSERT INTO "new_Service" ("category", "certificationKind", "createdAt", "description", "etaDaysFrom", "id", "imageUrl", "internalCode", "isActive", "priceFrom", "providerId", "ratingAvg", "ratingCount", "title", "updatedAt") SELECT "category", "certificationKind", "createdAt", "description", "etaDaysFrom", "id", "imageUrl", "internalCode", "isActive", "priceFrom", "providerId", "ratingAvg", "ratingCount", "title", "updatedAt" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
CREATE INDEX "Service_providerId_idx" ON "Service"("providerId");
CREATE UNIQUE INDEX "Service_providerId_internalCode_key" ON "Service"("providerId", "internalCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_userId_key" ON "CustomerProfile"("userId");

-- CreateIndex
CREATE INDEX "ClientProduct_customerProfileId_idx" ON "ClientProduct"("customerProfileId");

-- CreateIndex
CREATE INDEX "ClientProductDocument_clientProductId_idx" ON "ClientProductDocument"("clientProductId");

-- CreateIndex
CREATE INDEX "ClientProductDocument_uploadedByUserId_idx" ON "ClientProductDocument"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "ProductCertificate_clientProductId_idx" ON "ProductCertificate"("clientProductId");

-- CreateIndex
CREATE INDEX "ProductCertificate_orderId_idx" ON "ProductCertificate"("orderId");

-- CreateIndex
CREATE INDEX "OrderEventLog_orderId_idx" ON "OrderEventLog"("orderId");

-- CreateIndex
CREATE INDEX "OrderEventLog_changedByUserId_idx" ON "OrderEventLog"("changedByUserId");

-- CreateIndex
CREATE INDEX "OrderEventLog_type_idx" ON "OrderEventLog"("type");
