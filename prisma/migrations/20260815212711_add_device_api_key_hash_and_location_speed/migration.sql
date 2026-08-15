/*
  Warnings:

  - You are about to drop the `Device` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Location` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Location" DROP CONSTRAINT "Location_deviceId_fkey";

-- DropTable
DROP TABLE "Device";

-- DropTable
DROP TABLE "Location";

-- CreateTable
CREATE TABLE "device" (
    "id" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "apiKeyHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "speed" DECIMAL(8,3) NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_imei_key" ON "device"("imei");

-- CreateIndex
CREATE UNIQUE INDEX "device_apiKeyHash_key" ON "device"("apiKeyHash");

-- CreateIndex
CREATE INDEX "location_deviceId_idx" ON "location"("deviceId");

-- CreateIndex
CREATE INDEX "location_timestamp_idx" ON "location"("timestamp");

-- CreateIndex
CREATE INDEX "location_deviceId_timestamp_idx" ON "location"("deviceId", "timestamp");

-- AddForeignKey
ALTER TABLE "location" ADD CONSTRAINT "location_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
