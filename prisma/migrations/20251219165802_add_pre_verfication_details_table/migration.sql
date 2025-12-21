-- CreateTable
CREATE TABLE "PreVerificationDetails" (
    "id" UUID NOT NULL,
    "userEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreVerificationDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreVerificationDetails_userEmail_key" ON "PreVerificationDetails"("userEmail");
