-- AlterTable
ALTER TABLE "User" ADD COLUMN "requiresWorkLocation" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderMeal" ADD COLUMN "workLocation" TEXT;
