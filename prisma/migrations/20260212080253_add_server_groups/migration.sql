-- CreateTable
CREATE TABLE "ServerGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ServerGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Domain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "checkInterval" INTEGER NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "serverGroupId" TEXT,
    CONSTRAINT "Domain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Domain_serverGroupId_fkey" FOREIGN KEY ("serverGroupId") REFERENCES "ServerGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Domain" ("checkInterval", "createdAt", "customerName", "id", "isActive", "updatedAt", "url", "userId") SELECT "checkInterval", "createdAt", "customerName", "id", "isActive", "updatedAt", "url", "userId" FROM "Domain";
DROP TABLE "Domain";
ALTER TABLE "new_Domain" RENAME TO "Domain";
CREATE INDEX "Domain_isActive_idx" ON "Domain"("isActive");
CREATE INDEX "Domain_serverGroupId_idx" ON "Domain"("serverGroupId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
