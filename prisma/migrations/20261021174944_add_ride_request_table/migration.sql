-- CreateEnum
CREATE TYPE "RideRequestState" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ride_request" (
    "id" SERIAL NOT NULL,
    "experienceCode" VARCHAR(50) NOT NULL,
    "numberOfPassengers" INTEGER NOT NULL,
    "pickupLocation" VARCHAR(255) NOT NULL,
    "pickupDateTime" TIMESTAMP(3) NOT NULL,
    "departureDateTime" TIMESTAMP(3) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "countryCallingCode" VARCHAR(8) NOT NULL,
    "nationalNumber" VARCHAR(20) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'NGN',
    "minorAmount" INTEGER NOT NULL,
    "state" "RideRequestState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_request_pkey" PRIMARY KEY ("id")
);
