-- Add the backwards-compatible adoption fulfillment chain and shadow-agent audit store.
-- Existing non-adoption tasks keep their current fields and statuses.

ALTER TABLE "feedback_ticket"
  ADD COLUMN IF NOT EXISTS "adoption_id" TEXT,
  ADD COLUMN IF NOT EXISTS "task_id" TEXT,
  ADD COLUMN IF NOT EXISTS "ticket_type" TEXT,
  ADD COLUMN IF NOT EXISTS "requested_action" TEXT,
  ADD COLUMN IF NOT EXISTS "correlation_id" TEXT;

ALTER TABLE "task"
  ADD COLUMN IF NOT EXISTS "adoption_id" TEXT,
  ADD COLUMN IF NOT EXISTS "tree_id" TEXT,
  ADD COLUMN IF NOT EXISTS "deadline_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "accepted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "evidence_requirements_json" JSONB,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "recommendation" ADD COLUMN IF NOT EXISTS "agent_run_id" TEXT;

ALTER TABLE "tree_adoption" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "audit_log"
  ADD COLUMN IF NOT EXISTS "adoption_id" TEXT,
  ADD COLUMN IF NOT EXISTS "actor_type" TEXT,
  ADD COLUMN IF NOT EXISTS "correlation_id" TEXT;

CREATE TABLE "fulfillment_evidence" (
  "id" TEXT NOT NULL,
  "adoption_id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "submitted_by" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "media_json" JSONB NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fulfillment_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fulfillment_review" (
  "id" TEXT NOT NULL,
  "evidence_id" TEXT NOT NULL,
  "reviewer_id" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "reason_code" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fulfillment_review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "adoption_benefit_v2" (
  "id" TEXT NOT NULL,
  "adoption_id" TEXT NOT NULL,
  "benefit_key" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'locked',
  "details_json" JSONB NOT NULL DEFAULT '{}',
  "selected_at" TIMESTAMP(3),
  "fulfilled_at" TIMESTAMP(3),
  "confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "adoption_benefit_v2_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fulfillment_settlement" (
  "id" TEXT NOT NULL,
  "adoption_id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "villager_id" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "approved_by" TEXT,
  "approved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fulfillment_settlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "adoption_renewal" (
  "id" TEXT NOT NULL,
  "previous_adoption_id" TEXT NOT NULL,
  "new_adoption_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "due_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "adoption_renewal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_run" (
  "id" TEXT NOT NULL,
  "adoption_id" TEXT,
  "task_id" TEXT,
  "trigger_type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "model_provider" TEXT,
  "model_name" TEXT,
  "prompt_version" TEXT,
  "step_count" INTEGER NOT NULL DEFAULT 0,
  "token_usage" INTEGER,
  "latency_ms" INTEGER,
  "error_code" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  CONSTRAINT "agent_run_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_tool_call" (
  "id" TEXT NOT NULL,
  "run_id" TEXT NOT NULL,
  "tool_name" TEXT NOT NULL,
  "arguments_redacted" JSONB NOT NULL DEFAULT '{}',
  "permission_decision" TEXT NOT NULL,
  "result_status" TEXT NOT NULL,
  "latency_ms" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_tool_call_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fulfillment_evidence_task_id_version_key" ON "fulfillment_evidence"("task_id", "version");
CREATE UNIQUE INDEX "adoption_benefit_v2_adoption_id_benefit_key_key" ON "adoption_benefit_v2"("adoption_id", "benefit_key");
CREATE UNIQUE INDEX "fulfillment_settlement_task_id_key" ON "fulfillment_settlement"("task_id");
CREATE UNIQUE INDEX "adoption_renewal_previous_adoption_id_key" ON "adoption_renewal"("previous_adoption_id");
CREATE INDEX "feedback_ticket_adoption_id_created_at_idx" ON "feedback_ticket"("adoption_id", "created_at");
CREATE INDEX "feedback_ticket_task_id_created_at_idx" ON "feedback_ticket"("task_id", "created_at");
CREATE INDEX "feedback_ticket_ticket_type_status_idx" ON "feedback_ticket"("ticket_type", "status");
CREATE INDEX "task_adoption_id_status_idx" ON "task"("adoption_id", "status");
CREATE INDEX "task_tree_id_deadline_at_idx" ON "task"("tree_id", "deadline_at");
CREATE INDEX "recommendation_agent_run_id_idx" ON "recommendation"("agent_run_id");
CREATE INDEX "fulfillment_evidence_adoption_id_submitted_at_idx" ON "fulfillment_evidence"("adoption_id", "submitted_at");
CREATE INDEX "fulfillment_evidence_status_submitted_at_idx" ON "fulfillment_evidence"("status", "submitted_at");
CREATE INDEX "fulfillment_review_evidence_id_created_at_idx" ON "fulfillment_review"("evidence_id", "created_at");
CREATE INDEX "adoption_benefit_v2_adoption_id_status_idx" ON "adoption_benefit_v2"("adoption_id", "status");
CREATE INDEX "fulfillment_settlement_adoption_id_status_idx" ON "fulfillment_settlement"("adoption_id", "status");
CREATE INDEX "fulfillment_settlement_villager_id_status_idx" ON "fulfillment_settlement"("villager_id", "status");
CREATE INDEX "adoption_renewal_status_due_at_idx" ON "adoption_renewal"("status", "due_at");
CREATE INDEX "agent_run_adoption_id_started_at_idx" ON "agent_run"("adoption_id", "started_at");
CREATE INDEX "agent_run_status_started_at_idx" ON "agent_run"("status", "started_at");
CREATE INDEX "agent_tool_call_run_id_created_at_idx" ON "agent_tool_call"("run_id", "created_at");
CREATE INDEX "audit_log_adoption_id_created_at_idx" ON "audit_log"("adoption_id", "created_at");
CREATE INDEX "audit_log_correlation_id_idx" ON "audit_log"("correlation_id");

ALTER TABLE "feedback_ticket" ADD CONSTRAINT "feedback_ticket_adoption_id_fkey" FOREIGN KEY ("adoption_id") REFERENCES "tree_adoption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "feedback_ticket" ADD CONSTRAINT "feedback_ticket_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_adoption_id_fkey') THEN
    ALTER TABLE "task" ADD CONSTRAINT "task_adoption_id_fkey" FOREIGN KEY ("adoption_id") REFERENCES "tree_adoption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_tree_id_fkey') THEN
    ALTER TABLE "task" ADD CONSTRAINT "task_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "orchard_tree"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
ALTER TABLE "fulfillment_evidence" ADD CONSTRAINT "fulfillment_evidence_adoption_id_fkey" FOREIGN KEY ("adoption_id") REFERENCES "tree_adoption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fulfillment_evidence" ADD CONSTRAINT "fulfillment_evidence_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fulfillment_review" ADD CONSTRAINT "fulfillment_review_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "fulfillment_evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "adoption_benefit_v2" ADD CONSTRAINT "adoption_benefit_v2_adoption_id_fkey" FOREIGN KEY ("adoption_id") REFERENCES "tree_adoption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fulfillment_settlement" ADD CONSTRAINT "fulfillment_settlement_adoption_id_fkey" FOREIGN KEY ("adoption_id") REFERENCES "tree_adoption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fulfillment_settlement" ADD CONSTRAINT "fulfillment_settlement_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fulfillment_settlement" ADD CONSTRAINT "fulfillment_settlement_villager_id_fkey" FOREIGN KEY ("villager_id") REFERENCES "villager"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "adoption_renewal" ADD CONSTRAINT "adoption_renewal_previous_adoption_id_fkey" FOREIGN KEY ("previous_adoption_id") REFERENCES "tree_adoption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "adoption_renewal" ADD CONSTRAINT "adoption_renewal_new_adoption_id_fkey" FOREIGN KEY ("new_adoption_id") REFERENCES "tree_adoption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agent_tool_call" ADD CONSTRAINT "agent_tool_call_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "agent_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
