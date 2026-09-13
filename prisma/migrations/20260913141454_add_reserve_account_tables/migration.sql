-- CreateEnum
CREATE TYPE "ReservedAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "ReservedAccountRequestStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "reserved_account" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "accountPrefix" VARCHAR(10) NOT NULL,
    "accountCode" INTEGER NOT NULL,
    "accountReference" VARCHAR(100) NOT NULL,
    "accountNumber" VARCHAR(20) NOT NULL,
    "bankCode" VARCHAR(20) NOT NULL,
    "bankName" VARCHAR(100) NOT NULL,
    "customerEmail" VARCHAR(255) NOT NULL,
    "status" "ReservedAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reserved_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserved_account_request_log" (
    "id" TEXT NOT NULL,
    "accountPrefix" VARCHAR(10) NOT NULL DEFAULT 'FAH',
    "accountCode" SERIAL NOT NULL,
    "accountReference" VARCHAR(100) NOT NULL DEFAULT ("accountPrefix" || "accountCode"::text),
    "requestedBy" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "status" "ReservedAccountRequestStatus" NOT NULL DEFAULT 'PENDING',
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reserved_account_request_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_collection" (
    "id" TEXT NOT NULL,
    "transactionReference" VARCHAR(100) NOT NULL,
    "accountReference" VARCHAR(100) NOT NULL,
    "userId" INTEGER NOT NULL,
    "amountPaid" DECIMAL(18,2) NOT NULL,
    "paidOn" TIMESTAMP(3) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "senderAccountNumber" VARCHAR(20) NOT NULL,
    "senderAccountName" VARCHAR(255) NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_collection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reserved_account_accountCode_key" ON "reserved_account"("accountCode");

-- CreateIndex
CREATE UNIQUE INDEX "reserved_account_accountReference_key" ON "reserved_account"("accountReference");

-- CreateIndex
CREATE INDEX "reserved_account_userId_idx" ON "reserved_account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "reserved_account_request_log_accountCode_key" ON "reserved_account_request_log"("accountCode");

-- CreateIndex
CREATE UNIQUE INDEX "reserved_account_request_log_accountReference_key" ON "reserved_account_request_log"("accountReference");

-- CreateIndex
CREATE INDEX "reserved_account_request_log_requestedBy_idx" ON "reserved_account_request_log"("requestedBy");

-- CreateIndex
CREATE INDEX "reserved_account_request_log_ownerId_idx" ON "reserved_account_request_log"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_collection_transactionReference_key" ON "payment_collection"("transactionReference");

-- CreateIndex
CREATE INDEX "payment_collection_accountReference_idx" ON "payment_collection"("accountReference");

-- AddForeignKey
ALTER TABLE "reserved_account" ADD CONSTRAINT "reserved_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserved_account_request_log" ADD CONSTRAINT "reserved_account_request_log_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserved_account_request_log" ADD CONSTRAINT "reserved_account_request_log_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_collection" ADD CONSTRAINT "payment_collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
