-- AlterTable: add nullable columns first for backfill
ALTER TABLE "Order" ADD COLUMN "orderCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "fulfillmentType" "OrderFulfillmentType";

-- Backfill orderCode for existing rows (unique 6-char codes)
DO $$
DECLARE
  r RECORD;
  code TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i INT;
  ok BOOLEAN;
BEGIN
  FOR r IN SELECT id FROM "Order" WHERE "orderCode" IS NULL LOOP
    ok := false;
    WHILE NOT ok LOOP
      code := '';
      FOR i IN 1..6 LOOP
        code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
      END LOOP;
      BEGIN
        UPDATE "Order" SET "orderCode" = code WHERE id = r.id;
        ok := true;
      EXCEPTION WHEN unique_violation THEN
        ok := false;
      END;
    END LOOP;
  END LOOP;
END $$;

-- Enforce NOT NULL + unique on orderCode
ALTER TABLE "Order" ALTER COLUMN "orderCode" SET NOT NULL;
CREATE UNIQUE INDEX "Order_orderCode_key" ON "Order"("orderCode");

-- Default for new orders (DRAFT already committed in previous migration)
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"OrderStatus";

-- Index for draft reuse
CREATE INDEX "Order_requesterId_menuDate_status_idx" ON "Order"("requesterId", "menuDate", "status");
