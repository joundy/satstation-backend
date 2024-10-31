-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_runes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commitAddress" TEXT NOT NULL,
    "runeBitcoinAddress" TEXT NOT NULL,
    "feeRate" INTEGER NOT NULL,
    "minFundValue" INTEGER NOT NULL,
    "commitBufferHex" TEXT NOT NULL,
    "runeBufferHex" TEXT NOT NULL,
    "holderAddress" TEXT NOT NULL,
    "isCommited" BOOLEAN NOT NULL DEFAULT false,
    "transactionHash" TEXT,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "tapInternalKeyHex" TEXT NOT NULL,
    "userTapInternalKeyHex" TEXT NOT NULL,
    "dataHex" TEXT,
    "dataMimeType" TEXT,
    "runeName" TEXT,
    "pricePerRune" TEXT,
    "maxSupply" TEXT,
    "nearCreatorAddress" TEXT,
    "outpoint" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_runes" ("commitAddress", "commitBufferHex", "createdAt", "dataHex", "dataMimeType", "feeRate", "holderAddress", "id", "isCommited", "isConfirmed", "isValid", "lastCheckedAt", "maxSupply", "minFundValue", "nearCreatorAddress", "outpoint", "pricePerRune", "runeBitcoinAddress", "runeBufferHex", "runeName", "tapInternalKeyHex", "transactionHash", "userTapInternalKeyHex") SELECT "commitAddress", "commitBufferHex", "createdAt", "dataHex", "dataMimeType", "feeRate", "holderAddress", "id", "isCommited", "isConfirmed", "isValid", "lastCheckedAt", "maxSupply", "minFundValue", "nearCreatorAddress", "outpoint", "pricePerRune", "runeBitcoinAddress", "runeBufferHex", "runeName", "tapInternalKeyHex", "transactionHash", "userTapInternalKeyHex" FROM "runes";
DROP TABLE "runes";
ALTER TABLE "new_runes" RENAME TO "runes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
