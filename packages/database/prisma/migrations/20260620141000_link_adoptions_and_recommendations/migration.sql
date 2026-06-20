-- AlterTable
ALTER TABLE "orchard_tree" ADD COLUMN     "hiddenGeo" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "tree_adoption" ADD COLUMN     "rightsJson" JSONB;

-- CreateTable
CREATE TABLE "route_plan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inputsJson" JSONB NOT NULL,
    "outputJson" JSONB NOT NULL,
    "weatherSnapshotId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation" (
    "id" TEXT NOT NULL,
    "biz_date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target_object" TEXT,
    "evidence_json" JSONB NOT NULL,
    "message" TEXT NOT NULL,
    "action_steps" JSONB NOT NULL,
    "owner_role" TEXT NOT NULL,
    "expected_impact" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "route_plan_userId_created_at_idx" ON "route_plan"("userId", "created_at");

-- CreateIndex
CREATE INDEX "recommendation_biz_date_status_idx" ON "recommendation"("biz_date", "status");

-- CreateIndex
CREATE INDEX "recommendation_type_created_at_idx" ON "recommendation"("type", "created_at");

-- AddForeignKey
ALTER TABLE "route_plan" ADD CONSTRAINT "route_plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tree_adoption" ADD CONSTRAINT "tree_adoption_adopterId_fkey" FOREIGN KEY ("adopterId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rollback (manual only; do not execute automatically):
-- ALTER TABLE "tree_adoption" DROP CONSTRAINT "tree_adoption_adopterId_fkey";
-- ALTER TABLE "route_plan" DROP CONSTRAINT "route_plan_userId_fkey";
-- DROP TABLE "recommendation";
-- DROP TABLE "route_plan";
-- ALTER TABLE "tree_adoption" DROP COLUMN "rightsJson";
-- ALTER TABLE "orchard_tree" DROP COLUMN "version", DROP COLUMN "hiddenGeo";
