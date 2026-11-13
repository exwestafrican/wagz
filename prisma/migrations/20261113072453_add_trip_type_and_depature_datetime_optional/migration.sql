-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('ONE_WAY', 'ROUND_TRIP');

-- AlterTable
ALTER TABLE "ride_request" ADD COLUMN     "tripType" "TripType" NOT NULL DEFAULT 'ROUND_TRIP',
ALTER COLUMN "departureDateTime" DROP NOT NULL;
