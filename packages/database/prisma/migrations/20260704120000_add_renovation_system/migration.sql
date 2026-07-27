-- AlterTable
ALTER TABLE "space_node"
ADD COLUMN "building_age" INTEGER,
ADD COLUMN "building_material" TEXT,
ADD COLUMN "building_floors" INTEGER,
ADD COLUMN "building_area" DOUBLE PRECISION,
ADD COLUMN "building_orientation" TEXT,
ADD COLUMN "heritage_status" TEXT,
ADD COLUMN "last_renovation_at" TEXT,
ADD COLUMN "structural_condition" TEXT,
ADD COLUMN "aesthetic_condition" TEXT,
ADD COLUMN "functional_condition" TEXT,
ADD COLUMN "energy_score" DOUBLE PRECISION,
ADD COLUMN "insulation_quality" TEXT,
ADD COLUMN "ventilation_quality" TEXT,
ADD COLUMN "solar_potential" TEXT,
ADD COLUMN "energy_consumption_est" DOUBLE PRECISION,
ADD COLUMN "greenery_coverage" DOUBLE PRECISION,
ADD COLUMN "water_permeability" TEXT,
ADD COLUMN "biodiversity_index" TEXT,
ADD COLUMN "microclimate_zone" TEXT,
ADD COLUMN "photos" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "building_assessment" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "assessor_id" TEXT,
    "assessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "structural_score" INTEGER NOT NULL,
    "aesthetic_score" INTEGER NOT NULL,
    "functional_score" INTEGER NOT NULL,
    "safety_score" INTEGER NOT NULL,
    "energy_score" INTEGER NOT NULL,
    "ecological_score" INTEGER NOT NULL,
    "demolition_recommendation" TEXT,
    "demolition_reason" TEXT,
    "reuse_potential" TEXT,
    "retained_elements" JSONB NOT NULL DEFAULT '[]',
    "issues" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL DEFAULT 'admin',

    CONSTRAINT "building_assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spatial_diagnosis" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "biz_date" TEXT NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'medium',
    "issues" JSONB NOT NULL DEFAULT '[]',
    "evidence_json" JSONB NOT NULL DEFAULT '{}',
    "ai_summary" TEXT,
    "energy_issues" JSONB NOT NULL DEFAULT '[]',
    "spatial_issues" JSONB NOT NULL DEFAULT '[]',
    "ecological_issues" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spatial_diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renovation_strategy" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "diagnosis_id" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "materials" JSONB NOT NULL DEFAULT '[]',
    "techniques" JSONB NOT NULL DEFAULT '[]',
    "energy_construction" JSONB NOT NULL DEFAULT '[]',
    "ecological_measures" JSONB NOT NULL DEFAULT '[]',
    "intervention_type" TEXT,
    "old_new_relationship" TEXT,
    "architectural_form" JSONB NOT NULL DEFAULT '{}',
    "building_program" JSONB NOT NULL DEFAULT '[]',
    "estimated_duration" TEXT,
    "difficulty_level" TEXT,
    "estimated_cost_range" TEXT,
    "expected_impact" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "before_metrics" JSONB NOT NULL DEFAULT '{}',
    "after_metrics" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "renovation_strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_potential" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "location_name" TEXT NOT NULL,
    "location_lat" DOUBLE PRECISION NOT NULL,
    "location_lng" DOUBLE PRECISION NOT NULL,
    "site_area" DOUBLE PRECISION,
    "current_use" TEXT,
    "suitability_score" INTEGER NOT NULL,
    "accessibility_score" INTEGER NOT NULL,
    "view_score" INTEGER NOT NULL,
    "ecology_impact_score" INTEGER NOT NULL,
    "recommended_program" TEXT,
    "recommended_form" TEXT,
    "recommended_floors" INTEGER,
    "recommended_gfa" DOUBLE PRECISION,
    "form_keywords" JSONB NOT NULL DEFAULT '[]',
    "constraints" JSONB NOT NULL DEFAULT '[]',
    "rationale" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_potential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "building_assessment_nodeId_assessed_at_idx" ON "building_assessment"("nodeId", "assessed_at");

-- CreateIndex
CREATE INDEX "spatial_diagnosis_nodeId_biz_date_idx" ON "spatial_diagnosis"("nodeId", "biz_date");

-- CreateIndex
CREATE INDEX "spatial_diagnosis_urgency_status_idx" ON "spatial_diagnosis"("urgency", "status");

-- CreateIndex
CREATE INDEX "renovation_strategy_nodeId_status_idx" ON "renovation_strategy"("nodeId", "status");

-- CreateIndex
CREATE INDEX "renovation_strategy_category_priority_idx" ON "renovation_strategy"("category", "priority");

-- CreateIndex
CREATE INDEX "renovation_strategy_dimension_status_idx" ON "renovation_strategy"("dimension", "status");

-- CreateIndex
CREATE INDEX "site_potential_nodeId_suitability_score_idx" ON "site_potential"("nodeId", "suitability_score");

-- AddForeignKey
ALTER TABLE "building_assessment" ADD CONSTRAINT "building_assessment_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "space_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spatial_diagnosis" ADD CONSTRAINT "spatial_diagnosis_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "space_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renovation_strategy" ADD CONSTRAINT "renovation_strategy_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "space_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renovation_strategy" ADD CONSTRAINT "renovation_strategy_diagnosis_id_fkey" FOREIGN KEY ("diagnosis_id") REFERENCES "spatial_diagnosis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_potential" ADD CONSTRAINT "site_potential_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "space_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
