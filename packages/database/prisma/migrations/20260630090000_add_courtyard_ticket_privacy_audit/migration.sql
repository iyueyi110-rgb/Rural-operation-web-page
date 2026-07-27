-- CreateTable
CREATE TABLE "courtyard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sceneRealm" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "inventoryType" TEXT NOT NULL DEFAULT 'entire_house',
    "priceRule" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "locationGeo" TEXT,
    "description" TEXT,
    "amenities" JSONB NOT NULL DEFAULT '[]',
    "images" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courtyard_pkey" PRIMARY KEY ("id")
);

-- Backfill rows referenced by existing courtyard activities before adding the FK.
INSERT INTO "courtyard" ("id", "name", "sceneRealm", "capacity", "status", "description", "updated_at")
VALUES
  ('ridge-shared-courtyard', '岭上共居院', 'ridge_dwelling', 8, 'active', '演示院落，用于活动与预约闭环。', CURRENT_TIMESTAMP),
  ('lychee-food-courtyard', '荔枝食育院', 'lychee_field', 12, 'active', '演示院落，用于活动与预约闭环。', CURRENT_TIMESTAMP),
  ('ancient-road-station', '古道驿站院', 'ancient_road', 6, 'maintenance', '演示院落，用于活动与预约闭环。', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- CreateTable
CREATE TABLE "ticket_product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "totalStock" INTEGER NOT NULL DEFAULT 100,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'on_sale',
    "validFrom" TEXT,
    "validTo" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_order" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_record" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courtyard_sceneRealm_status_idx" ON "courtyard"("sceneRealm", "status");

-- CreateIndex
CREATE INDEX "ticket_product_category_status_idx" ON "ticket_product"("category", "status");

-- CreateIndex
CREATE INDEX "ticket_order_userId_created_at_idx" ON "ticket_order"("userId", "created_at");

-- CreateIndex
CREATE INDEX "ticket_order_guestPhone_created_at_idx" ON "ticket_order"("guestPhone", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "consent_record_userId_consentType_key" ON "consent_record"("userId", "consentType");

-- CreateIndex
CREATE INDEX "consent_record_userId_idx" ON "consent_record"("userId");

-- CreateIndex
CREATE INDEX "audit_log_actorId_created_at_idx" ON "audit_log"("actorId", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_action_created_at_idx" ON "audit_log"("action", "created_at");

-- AddForeignKey
ALTER TABLE "courtyard_activity" ADD CONSTRAINT "courtyard_activity_courtyardId_fkey" FOREIGN KEY ("courtyardId") REFERENCES "courtyard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_order" ADD CONSTRAINT "ticket_order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ticket_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rollback (manual only; do not execute automatically):
-- ALTER TABLE "ticket_order" DROP CONSTRAINT "ticket_order_productId_fkey";
-- ALTER TABLE "courtyard_activity" DROP CONSTRAINT "courtyard_activity_courtyardId_fkey";
-- DROP TABLE "audit_log";
-- DROP TABLE "consent_record";
-- DROP TABLE "ticket_order";
-- DROP TABLE "ticket_product";
-- DROP TABLE "courtyard";
