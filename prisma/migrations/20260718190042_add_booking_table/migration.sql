-- CreateTable
CREATE TABLE "booking" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "tripType" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" VARCHAR(4) NOT NULL,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_clientId_idx" ON "booking"("clientId");

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
