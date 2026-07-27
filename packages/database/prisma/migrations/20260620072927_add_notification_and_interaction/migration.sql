-- AlterTable
ALTER TABLE "tree_adoption" ADD COLUMN     "adopterId" TEXT;

-- AlterTable
ALTER TABLE "villager" ADD COLUMN     "otpCode" TEXT,
ADD COLUMN     "otpExpiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "category" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_interaction_task" (
    "id" TEXT NOT NULL,
    "adoptionId" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "imageUrl" TEXT,
    "note" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_interaction_task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_recipientType_recipientId_created_at_idx" ON "notification"("recipientType", "recipientId", "created_at");

-- CreateIndex
CREATE INDEX "notification_isRead_created_at_idx" ON "notification"("isRead", "created_at");

-- CreateIndex
CREATE INDEX "visitor_interaction_task_adoptionId_status_created_at_idx" ON "visitor_interaction_task"("adoptionId", "status", "created_at");

-- CreateIndex
CREATE INDEX "visitor_interaction_task_treeId_created_at_idx" ON "visitor_interaction_task"("treeId", "created_at");

-- AddForeignKey
ALTER TABLE "visitor_interaction_task" ADD CONSTRAINT "visitor_interaction_task_adoptionId_fkey" FOREIGN KEY ("adoptionId") REFERENCES "tree_adoption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_interaction_task" ADD CONSTRAINT "visitor_interaction_task_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "orchard_tree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rollback SQL (run manually only after confirming the new tables contain no required data):
-- DROP TABLE "visitor_interaction_task";
-- DROP TABLE "notification";
-- ALTER TABLE "tree_adoption" DROP COLUMN "adopterId";
-- ALTER TABLE "villager" DROP COLUMN "otpCode", DROP COLUMN "otpExpiry";
