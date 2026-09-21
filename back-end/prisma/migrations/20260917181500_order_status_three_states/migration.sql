-- Remap legacy statuses before shrinking the enum
UPDATE "Order" SET status = 'ACCEPTED' WHERE status = 'PREPARING';
UPDATE "Order" SET status = 'READY' WHERE status = 'DELIVERED';
UPDATE "Order" SET status = 'SUBMITTED' WHERE status = 'CANCELLED';

UPDATE "OrderStatusHistory" SET "fromStatus" = 'ACCEPTED' WHERE "fromStatus" = 'PREPARING';
UPDATE "OrderStatusHistory" SET "fromStatus" = 'READY' WHERE "fromStatus" = 'DELIVERED';
UPDATE "OrderStatusHistory" SET "fromStatus" = 'SUBMITTED' WHERE "fromStatus" = 'CANCELLED';

UPDATE "OrderStatusHistory" SET "toStatus" = 'ACCEPTED' WHERE "toStatus" = 'PREPARING';
UPDATE "OrderStatusHistory" SET "toStatus" = 'READY' WHERE "toStatus" = 'DELIVERED';
UPDATE "OrderStatusHistory" SET "toStatus" = 'SUBMITTED' WHERE "toStatus" = 'CANCELLED';

-- Recreate enum with only three values
CREATE TYPE "OrderStatus_new" AS ENUM ('SUBMITTED', 'ACCEPTED', 'READY');

ALTER TABLE "Order"
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE "OrderStatus_new"
  USING (status::text::"OrderStatus_new");

ALTER TABLE "Order"
  ALTER COLUMN status SET DEFAULT 'SUBMITTED'::"OrderStatus_new";

ALTER TABLE "OrderStatusHistory"
  ALTER COLUMN "fromStatus" TYPE "OrderStatus_new"
  USING (
    CASE
      WHEN "fromStatus" IS NULL THEN NULL
      ELSE "fromStatus"::text::"OrderStatus_new"
    END
  );

ALTER TABLE "OrderStatusHistory"
  ALTER COLUMN "toStatus" TYPE "OrderStatus_new"
  USING ("toStatus"::text::"OrderStatus_new");

DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
