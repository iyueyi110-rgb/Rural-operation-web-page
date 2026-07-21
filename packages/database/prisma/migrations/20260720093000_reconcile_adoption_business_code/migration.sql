-- Reconcile business-code columns that existed in some development databases
-- but were not represented in the recorded baseline migration history.
ALTER TABLE "tree_adoption"
  ADD COLUMN IF NOT EXISTS "adoption_code" TEXT,
  ADD COLUMN IF NOT EXISTS "agreement_version" TEXT NOT NULL DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "activated_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "next_care_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "renewal_at" TIMESTAMP(3);

UPDATE "tree_adoption" SET "adoption_code" = "id" WHERE "adoption_code" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "tree_adoption_adoption_code_key" ON "tree_adoption"("adoption_code");
