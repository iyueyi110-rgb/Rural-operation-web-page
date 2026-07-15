-- Add the isolated adoption rule-simulation store. These tables never reference
-- production adoption, task, payment, or order tables.

CREATE TABLE "simulation_world" (
    "id" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "random_seed" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "world_hash" TEXT NOT NULL,
    "data_origin" TEXT NOT NULL DEFAULT 'simulation',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "simulation_world_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "simulation_run" (
    "id" TEXT NOT NULL,
    "pair_id" TEXT,
    "world_id" TEXT NOT NULL,
    "run_name" TEXT NOT NULL,
    "policy_version" TEXT NOT NULL,
    "policy_revision" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSONB,
    "metrics" JSONB,
    "decision" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "data_origin" TEXT NOT NULL DEFAULT 'simulation',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "simulation_run_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "simulation_event" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "random_seed" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "adoption_id" TEXT,
    "task_id" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "actor_id" TEXT,
    "actor_type" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "payload" JSONB,
    "data_origin" TEXT NOT NULL DEFAULT 'simulation',
    "policy_version" TEXT NOT NULL,
    "policy_revision" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "simulation_event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "simulation_bad_case" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "task_id" TEXT,
    "adoption_id" TEXT,
    "event_ids" JSONB NOT NULL DEFAULT '[]',
    "root_cause" TEXT,
    "improvement_action" TEXT,
    "data_origin" TEXT NOT NULL DEFAULT 'simulation',
    "policy_version" TEXT NOT NULL,
    "policy_revision" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "simulation_bad_case_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "simulation_world_scenario_id_random_seed_idx" ON "simulation_world"("scenario_id", "random_seed");
CREATE INDEX "simulation_world_world_hash_idx" ON "simulation_world"("world_hash");
CREATE INDEX "simulation_run_pair_id_idx" ON "simulation_run"("pair_id");
CREATE INDEX "simulation_run_world_id_policy_version_idx" ON "simulation_run"("world_id", "policy_version");
CREATE INDEX "simulation_run_status_created_at_idx" ON "simulation_run"("status", "created_at");
CREATE INDEX "simulation_run_archived_at_created_at_idx" ON "simulation_run"("archived_at", "created_at");
CREATE INDEX "simulation_event_run_id_occurred_at_idx" ON "simulation_event"("run_id", "occurred_at");
CREATE INDEX "simulation_event_run_id_adoption_id_occurred_at_idx" ON "simulation_event"("run_id", "adoption_id", "occurred_at");
CREATE INDEX "simulation_event_run_id_task_id_occurred_at_idx" ON "simulation_event"("run_id", "task_id", "occurred_at");
CREATE INDEX "simulation_event_scenario_id_random_seed_occurred_at_idx" ON "simulation_event"("scenario_id", "random_seed", "occurred_at");
CREATE INDEX "simulation_event_entity_type_entity_id_occurred_at_idx" ON "simulation_event"("entity_type", "entity_id", "occurred_at");
CREATE INDEX "simulation_event_actor_id_occurred_at_idx" ON "simulation_event"("actor_id", "occurred_at");
CREATE INDEX "simulation_event_event_type_occurred_at_idx" ON "simulation_event"("event_type", "occurred_at");
CREATE INDEX "simulation_event_policy_version_occurred_at_idx" ON "simulation_event"("policy_version", "occurred_at");
CREATE INDEX "simulation_bad_case_run_id_category_severity_idx" ON "simulation_bad_case"("run_id", "category", "severity");
CREATE INDEX "simulation_bad_case_run_id_task_id_idx" ON "simulation_bad_case"("run_id", "task_id");
CREATE INDEX "simulation_bad_case_policy_version_created_at_idx" ON "simulation_bad_case"("policy_version", "created_at");

ALTER TABLE "simulation_run" ADD CONSTRAINT "simulation_run_world_id_fkey"
    FOREIGN KEY ("world_id") REFERENCES "simulation_world"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "simulation_event" ADD CONSTRAINT "simulation_event_run_id_fkey"
    FOREIGN KEY ("run_id") REFERENCES "simulation_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "simulation_bad_case" ADD CONSTRAINT "simulation_bad_case_run_id_fkey"
    FOREIGN KEY ("run_id") REFERENCES "simulation_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rollback:
-- DROP TABLE "simulation_bad_case";
-- DROP TABLE "simulation_event";
-- DROP TABLE "simulation_run";
-- DROP TABLE "simulation_world";
