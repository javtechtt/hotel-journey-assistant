-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,
    "checkInDate" DATETIME NOT NULL,
    "checkOutDate" DATETIME NOT NULL,
    "nights" INTEGER NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "roomId" TEXT,
    "status" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "taxesCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "cardLast4" TEXT,
    "cardBrand" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    CONSTRAINT "Reservation_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Reservation" ("cardBrand", "cardLast4", "checkInDate", "checkOutDate", "code", "confirmedAt", "createdAt", "guestName", "id", "nights", "partySize", "roomId", "roomTypeId", "status", "subtotalCents", "taxesCents", "totalCents") SELECT "cardBrand", "cardLast4", "checkInDate", "checkOutDate", "code", "confirmedAt", "createdAt", "guestName", "id", "nights", "partySize", "roomId", "roomTypeId", "status", "subtotalCents", "taxesCents", "totalCents" FROM "Reservation";
DROP TABLE "Reservation";
ALTER TABLE "new_Reservation" RENAME TO "Reservation";
CREATE UNIQUE INDEX "Reservation_code_key" ON "Reservation"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
