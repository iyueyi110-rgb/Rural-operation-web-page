-- AlterTable
ALTER TABLE "unified_order" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "unified_order_userId_created_at_idx" ON "unified_order"("userId", "created_at");

-- Rollback (manual only; do not execute automatically):
-- DROP INDEX "unified_order_userId_created_at_idx";
-- ALTER TABLE "unified_order" DROP COLUMN "userId";
