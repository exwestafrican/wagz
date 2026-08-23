-- CreateTable
CREATE TABLE "geofence" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 75,
    "transitionZoneMeters" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_state" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "beginningLocationId" TEXT,
    "endLocationId" TEXT,
    "geoTag" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_state_beginningLocationId_key" ON "device_state"("beginningLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "device_state_endLocationId_key" ON "device_state"("endLocationId");

-- AddForeignKey
ALTER TABLE "geofence" ADD CONSTRAINT "geofence_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_state" ADD CONSTRAINT "device_state_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
