-- AlterTable
ALTER TABLE "visitor_interaction_task"
ADD COLUMN     "periodKey" TEXT,
ADD COLUMN     "maxCompletions" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "completionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pointsPerCompletion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPointsEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "seasonEventId" TEXT;

-- Backfill repeat-aware fields for existing rows.
UPDATE "visitor_interaction_task"
SET
  "maxCompletions" = CASE WHEN "taskType" = 'watering' THEN 1 ELSE 1 END,
  "completionCount" = CASE WHEN "status" = 'completed' THEN 1 ELSE 0 END,
  "pointsPerCompletion" = CASE
    WHEN "taskType" = 'watering' THEN 10
    WHEN "taskType" = 'fertilizing' THEN 10
    WHEN "taskType" = 'photo_upload' THEN 15
    WHEN "taskType" = 'diary' THEN 20
    WHEN "taskType" = 'share' THEN 15
    ELSE 0
  END,
  "totalPointsEarned" = "points";

-- CreateTable
CREATE TABLE "adoption_points" (
    "id" TEXT NOT NULL,
    "adoptionId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "availablePoints" INTEGER NOT NULL DEFAULT 0,
    "redeemedPoints" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adoption_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_transaction" (
    "id" TEXT NOT NULL,
    "adoptionPointsId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "referenceId" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_event" (
    "id" TEXT NOT NULL,
    "solarTerm" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "taskType" TEXT NOT NULL,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "season_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemption_option" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "pointsCost" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT -1,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redemption_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemption_record" (
    "id" TEXT NOT NULL,
    "adoptionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "pointsSpent" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),

    CONSTRAINT "redemption_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "adoption_points_adoptionId_key" ON "adoption_points"("adoptionId");

-- CreateIndex
CREATE INDEX "points_transaction_adoptionPointsId_created_at_idx" ON "points_transaction"("adoptionPointsId", "created_at");

-- CreateIndex
CREATE INDEX "points_transaction_adoptionPointsId_type_idx" ON "points_transaction"("adoptionPointsId", "type");

-- CreateIndex
CREATE INDEX "season_event_startDate_endDate_status_idx" ON "season_event"("startDate", "endDate", "status");

-- CreateIndex
CREATE INDEX "redemption_record_adoptionId_created_at_idx" ON "redemption_record"("adoptionId", "created_at");

-- CreateIndex
CREATE INDEX "visitor_interaction_task_adoptionId_periodKey_status_idx" ON "visitor_interaction_task"("adoptionId", "periodKey", "status");

-- CreateIndex
CREATE INDEX "visitor_interaction_task_adoptionId_taskType_periodKey_idx" ON "visitor_interaction_task"("adoptionId", "taskType", "periodKey");

-- AddForeignKey
ALTER TABLE "visitor_interaction_task" ADD CONSTRAINT "visitor_interaction_task_seasonEventId_fkey" FOREIGN KEY ("seasonEventId") REFERENCES "season_event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoption_points" ADD CONSTRAINT "adoption_points_adoptionId_fkey" FOREIGN KEY ("adoptionId") REFERENCES "tree_adoption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_transaction" ADD CONSTRAINT "points_transaction_adoptionPointsId_fkey" FOREIGN KEY ("adoptionPointsId") REFERENCES "adoption_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_record" ADD CONSTRAINT "redemption_record_adoptionId_fkey" FOREIGN KEY ("adoptionId") REFERENCES "tree_adoption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_record" ADD CONSTRAINT "redemption_record_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "redemption_option"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
