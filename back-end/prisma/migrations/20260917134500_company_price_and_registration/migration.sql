-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('PEDERTRACTOR', 'TRACTOR');

-- CreateEnum
CREATE TYPE "CompanyKind" AS ENUM ('PEDERTRACTOR', 'TRACTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable Company
ALTER TABLE "Company" ADD COLUMN "code" TEXT;

-- AlterTable User
ALTER TABLE "User" ADD COLUMN "phone" TEXT,
ADD COLUMN "cardNumber" TEXT,
ADD COLUMN "unit" "Unit";

-- Clear meal prices before requiring companyId (seed will recreate per company)
DELETE FROM "MealPrice";

-- AlterTable MealPrice
ALTER TABLE "MealPrice" ADD COLUMN "companyId" TEXT NOT NULL;

-- CreateTable RegistrationRequest
CREATE TABLE "RegistrationRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "companyKind" "CompanyKind" NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyId" TEXT,
    "cardNumber" TEXT,
    "unit" "Unit",
    "employeeExternalId" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_cardNumber_unit_key" ON "User"("cardNumber", "unit");

-- CreateIndex
CREATE INDEX "MealPrice_companyId_effectiveFrom_idx" ON "MealPrice"("companyId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "RegistrationRequest_status_idx" ON "RegistrationRequest"("status");

-- CreateIndex
CREATE INDEX "RegistrationRequest_email_idx" ON "RegistrationRequest"("email");

-- CreateIndex
CREATE INDEX "RegistrationRequest_createdAt_idx" ON "RegistrationRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "MealPrice" ADD CONSTRAINT "MealPrice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
