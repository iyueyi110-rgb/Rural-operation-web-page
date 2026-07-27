-- CreateTable
CREATE TABLE "payment_order" (
    "id" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'mock_demo',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "idempotentKey" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_order_idempotentKey_key" ON "payment_order"("idempotentKey");

-- CreateIndex
CREATE INDEX "payment_order_orderType_orderId_idx" ON "payment_order"("orderType", "orderId");

-- CreateIndex
CREATE INDEX "payment_order_userId_created_at_idx" ON "payment_order"("userId", "created_at");

-- CreateIndex
CREATE INDEX "payment_order_status_created_at_idx" ON "payment_order"("status", "created_at");

-- Rollback (manual only; do not execute automatically):
-- DROP TABLE "payment_order";
