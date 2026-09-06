-- CreateEnum
CREATE TYPE "BookingState" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingReason" AS ENUM ('NOT_CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('FLEET', 'CLIENT');

-- CreateTable
CREATE TABLE "booking" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3),
    "state" "BookingState" NOT NULL DEFAULT 'PENDING',
    "reason" "BookingReason",
    "type" "BookingType" NOT NULL,
    "note" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_pickup_detail" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100),
    "pickupLocation" VARCHAR(255) NOT NULL,
    "locationUrl" VARCHAR(600) NOT NULL,

    CONSTRAINT "client_pickup_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_assignment" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "assignedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_userId_idx" ON "booking"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "client_pickup_detail_bookingId_key" ON "client_pickup_detail"("bookingId");

-- CreateIndex
CREATE INDEX "booking_assignment_bookingId_idx" ON "booking_assignment"("bookingId");

-- CreateIndex
CREATE INDEX "booking_assignment_assignedById_idx" ON "booking_assignment"("assignedById");

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_pickup_detail" ADD CONSTRAINT "client_pickup_detail_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_assignment" ADD CONSTRAINT "booking_assignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_assignment" ADD CONSTRAINT "booking_assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_assignment" ADD CONSTRAINT "booking_assignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
