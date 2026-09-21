-- CreateEnum
CREATE TYPE "OrderFulfillmentType" AS ENUM ('PICKUP', 'DELIVERY');

-- AlterEnum (must be committed before DEFAULT uses DRAFT)
ALTER TYPE "OrderStatus" ADD VALUE 'DRAFT';
