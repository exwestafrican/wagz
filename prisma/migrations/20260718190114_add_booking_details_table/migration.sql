-- CreateTable
CREATE TABLE "booking_details" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "pickup_location" VARCHAR(5000) NOT NULL,
    "pickup_location_map_link" VARCHAR(800) NOT NULL,
    "dropoff_location" VARCHAR(5000) NOT NULL,
    "dropoff_location_map_link" VARCHAR(800) NOT NULL,
    "scheduled_time" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "sequence" INTEGER NOT NULL,
    "additional_details" VARCHAR(5000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_details_bookingId_idx" ON "booking_details"("bookingId");

-- AddForeignKey
ALTER TABLE "booking_details" ADD CONSTRAINT "booking_details_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
