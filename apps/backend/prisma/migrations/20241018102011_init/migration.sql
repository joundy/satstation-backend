-- CreateTable
CREATE TABLE "runes" (
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
    "pricePerRune" INTEGER,
    "maxSupply" TEXT,
    "nearCreatorAddress" TEXT,
    "outpoint" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "withdraws" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nearAccountAddress" TEXT NOT NULL,
    "isWithdrawn" BOOLEAN NOT NULL DEFAULT false,
    "transactionHash" TEXT,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
