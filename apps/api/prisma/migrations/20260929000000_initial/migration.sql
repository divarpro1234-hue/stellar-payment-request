-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" UUID NOT NULL,
    "requestHash" TEXT NOT NULL,
    "destinationHash" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "assetIssuer" TEXT,
    "amount" DECIMAL(65,7) NOT NULL,
    "memoType" TEXT NOT NULL,
    "memoHash" TEXT,
    "network" TEXT NOT NULL,
    "trustlineStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnchainRegistration" (
    "id" UUID NOT NULL,
    "paymentRequestId" UUID NOT NULL,
    "contractId" TEXT NOT NULL,
    "registrant" TEXT NOT NULL,
    "txHash" TEXT,
    "status" TEXT NOT NULL,
    "ledgerSequence" BIGINT,
    "registeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnchainRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketPriceCache" (
    "pair" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "AssetCatalog" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "issuer" TEXT,
    "displayName" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "isNative" BOOLEAN NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_requestHash_key" ON "PaymentRequest"("requestHash");

-- CreateIndex
CREATE UNIQUE INDEX "OnchainRegistration_paymentRequestId_key" ON "OnchainRegistration"("paymentRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketPriceCache_pair_key" ON "MarketPriceCache"("pair");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCatalog_code_issuer_network_key" ON "AssetCatalog"("code", "issuer", "network");

-- AddForeignKey
ALTER TABLE "OnchainRegistration" ADD CONSTRAINT "OnchainRegistration_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
