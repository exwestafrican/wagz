-- CreateTable
CREATE TABLE "invoice" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" VARCHAR(4) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "paymentLink" VARCHAR(800),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "gatewayReference" VARCHAR(1000),
    "additionalDetails" VARCHAR(5000),

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_gatewayReference_key" ON "invoice"("gatewayReference");

-- CreateIndex
CREATE INDEX "invoice_bookingId_idx" ON "invoice"("bookingId");

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
