-- CreateTable
CREATE TABLE "company_profiles" (
    "id" SERIAL NOT NULL,
    "companyName" VARCHAR(255) NOT NULL,
    "domain" VARCHAR(100),
    "pointOfContactEmail" VARCHAR(255) NOT NULL,
    "phoneCountryCode" VARCHAR(5),
    "phoneNumber" VARCHAR(15),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_profiles_domain_key" ON "company_profiles"("domain");

-- CreateIndex
CREATE INDEX "company_profiles_pointOfContactEmail_idx" ON "company_profiles"("pointOfContactEmail");
