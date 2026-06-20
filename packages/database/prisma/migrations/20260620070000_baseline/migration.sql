-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "feedback_ticket" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "assignee" TEXT,
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_handling_record" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_handling_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_node" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "realm" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "capacity" INTEGER NOT NULL DEFAULT 50,
    "terrainRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "watersideRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "space_node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "villager" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "nodeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "villager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "villagerId" TEXT,
    "nodeId" TEXT,
    "scheduledDate" TEXT,
    "earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farming_calendar" (
    "id" TEXT NOT NULL,
    "solarTerm" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "treeSpecies" TEXT,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farming_calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presence_log" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "visitorId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "peopleCount" INTEGER NOT NULL,
    "dwellAvgMin" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'wifi_probe',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presence_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "userAgent" TEXT,
    "screenSize" TEXT,
    "timezone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_daily_score" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "totalVisitors" INTEGER NOT NULL DEFAULT 0,
    "peakPeopleCount" INTEGER NOT NULL DEFAULT 0,
    "avgDwellMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attractiveness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "safetyRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weatherCondition" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "node_daily_score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unified_order" (
    "id" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "nodeId" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unified_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_report" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "metrics" JSONB NOT NULL,
    "actionItems" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_reading" (
    "id" TEXT NOT NULL,
    "sensorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "nodeId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'iot_gateway',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_reading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "nodeId" TEXT,
    "location" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_reading" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_reading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "unit" TEXT,
    "stockStatus" TEXT NOT NULL DEFAULT 'available',
    "nodeId" TEXT,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orchard_tree" (
    "id" TEXT NOT NULL,
    "treeCode" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "healthStatus" TEXT NOT NULL DEFAULT 'good',
    "blurredLocation" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "fireMemory" TEXT,
    "newShootsRecord" TEXT,
    "growthPhotos" JSONB NOT NULL DEFAULT '[]',
    "adoptStatus" TEXT NOT NULL DEFAULT 'available',
    "adoptPrice" DOUBLE PRECISION,
    "harvestSeason" TEXT,
    "fruitVariety" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orchard_tree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tree_care_log" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "logType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "operator" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tree_care_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tree_adoption" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "adopterName" TEXT,
    "adopterPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tree_adoption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harvest_booking" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "scheduledDate" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "fruitDestination" TEXT,
    "destinationNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "harvest_booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harvest_shipment" (
    "id" TEXT NOT NULL,
    "harvest_booking_id" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "courier" TEXT,
    "trackingNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "harvest_shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_generation_log" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "weather" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_generation_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert" (
    "id" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "nodeId" TEXT,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courtyard_activity" (
    "id" TEXT NOT NULL,
    "courtyardId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "maxCapacity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION,
    "scheduledDate" TEXT NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courtyard_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_booking" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_command" (
    "id" TEXT NOT NULL,
    "commandType" TEXT NOT NULL,
    "targetNodeId" TEXT,
    "priority" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "triggeredBy" TEXT NOT NULL DEFAULT 'rule_engine',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_command_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "space_node_slug_key" ON "space_node"("slug");

-- CreateIndex
CREATE INDEX "villager_status_nodeId_idx" ON "villager"("status", "nodeId");

-- CreateIndex
CREATE INDEX "task_status_taskType_idx" ON "task"("status", "taskType");

-- CreateIndex
CREATE INDEX "task_villagerId_created_at_idx" ON "task"("villagerId", "created_at");

-- CreateIndex
CREATE INDEX "farming_calendar_startDate_idx" ON "farming_calendar"("startDate");

-- CreateIndex
CREATE INDEX "presence_log_nodeId_timestamp_idx" ON "presence_log"("nodeId", "timestamp");

-- CreateIndex
CREATE INDEX "presence_log_visitorId_timestamp_idx" ON "presence_log"("visitorId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "visitor_fingerprint_key" ON "visitor"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "node_daily_score_nodeId_date_key" ON "node_daily_score"("nodeId", "date");

-- CreateIndex
CREATE INDEX "unified_order_nodeId_created_at_idx" ON "unified_order"("nodeId", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "daily_report_date_key" ON "daily_report"("date");

-- CreateIndex
CREATE INDEX "sensor_reading_sensorId_created_at_idx" ON "sensor_reading"("sensorId", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "device_deviceId_key" ON "device"("deviceId");

-- CreateIndex
CREATE INDEX "device_status_lastSeenAt_idx" ON "device"("status", "lastSeenAt");

-- CreateIndex
CREATE INDEX "device_reading_deviceId_created_at_idx" ON "device_reading"("deviceId", "created_at");

-- CreateIndex
CREATE INDEX "product_category_status_idx" ON "product"("category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "orchard_tree_treeCode_key" ON "orchard_tree"("treeCode");

-- CreateIndex
CREATE INDEX "tree_care_log_treeId_created_at_idx" ON "tree_care_log"("treeId", "created_at");

-- CreateIndex
CREATE INDEX "tree_adoption_adopterPhone_created_at_idx" ON "tree_adoption"("adopterPhone", "created_at");

-- CreateIndex
CREATE INDEX "harvest_booking_treeId_scheduledDate_idx" ON "harvest_booking"("treeId", "scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "harvest_shipment_harvest_booking_id_key" ON "harvest_shipment"("harvest_booking_id");

-- CreateIndex
CREATE INDEX "harvest_shipment_status_created_at_idx" ON "harvest_shipment"("status", "created_at");

-- CreateIndex
CREATE INDEX "alert_alertType_created_at_idx" ON "alert"("alertType", "created_at");

-- CreateIndex
CREATE INDEX "courtyard_activity_courtyardId_scheduledDate_idx" ON "courtyard_activity"("courtyardId", "scheduledDate");

-- CreateIndex
CREATE INDEX "control_command_status_created_at_idx" ON "control_command"("status", "created_at");

-- AddForeignKey
ALTER TABLE "feedback_handling_record" ADD CONSTRAINT "feedback_handling_record_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "feedback_ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "villager" ADD CONSTRAINT "villager_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "space_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_villagerId_fkey" FOREIGN KEY ("villagerId") REFERENCES "villager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "space_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presence_log" ADD CONSTRAINT "presence_log_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "space_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presence_log" ADD CONSTRAINT "presence_log_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_daily_score" ADD CONSTRAINT "node_daily_score_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "space_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unified_order" ADD CONSTRAINT "unified_order_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "space_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device" ADD CONSTRAINT "device_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "space_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_reading" ADD CONSTRAINT "device_reading_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "device"("deviceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "space_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tree_care_log" ADD CONSTRAINT "tree_care_log_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "orchard_tree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tree_adoption" ADD CONSTRAINT "tree_adoption_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "orchard_tree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvest_booking" ADD CONSTRAINT "harvest_booking_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "orchard_tree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvest_shipment" ADD CONSTRAINT "harvest_shipment_harvest_booking_id_fkey" FOREIGN KEY ("harvest_booking_id") REFERENCES "harvest_booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_booking" ADD CONSTRAINT "activity_booking_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "courtyard_activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
