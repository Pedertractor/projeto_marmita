-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordResetCodeHash" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "passwordResetSentAt" TIMESTAMP(3);
