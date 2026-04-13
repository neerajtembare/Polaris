-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "timeframe" TEXT NOT NULL DEFAULT 'short',
    "target_value" DOUBLE PRECISION,
    "target_unit" TEXT,
    "target_date" TIMESTAMP(3),
    "parent_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "user_id" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "activity_type" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "unit" TEXT,
    "raw_input" TEXT,
    "goal_id" TEXT,
    "activity_date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'growth',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "ai_categorized" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "previous_state" TEXT,
    "new_state" TEXT NOT NULL,
    "metadata" TEXT,
    "user_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "focus_sessions" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT,
    "activity_id" TEXT,
    "planned_mins" INTEGER NOT NULL,
    "actual_mins" INTEGER,
    "breaks" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "notes" TEXT,
    "user_id" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "focus_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_parent_id_idx" ON "goals"("parent_id");

-- CreateIndex
CREATE INDEX "goals_timeframe_idx" ON "goals"("timeframe");

-- CreateIndex
CREATE INDEX "goals_status_idx" ON "goals"("status");

-- CreateIndex
CREATE INDEX "goals_is_deleted_idx" ON "goals"("is_deleted");

-- CreateIndex
CREATE INDEX "goals_is_deleted_status_idx" ON "goals"("is_deleted", "status");

-- CreateIndex
CREATE INDEX "activities_activity_date_idx" ON "activities"("activity_date");

-- CreateIndex
CREATE INDEX "activities_goal_id_idx" ON "activities"("goal_id");

-- CreateIndex
CREATE INDEX "activities_category_idx" ON "activities"("category");

-- CreateIndex
CREATE INDEX "activities_status_idx" ON "activities"("status");

-- CreateIndex
CREATE INDEX "activities_is_deleted_idx" ON "activities"("is_deleted");

-- CreateIndex
CREATE INDEX "activities_goal_id_is_deleted_idx" ON "activities"("goal_id", "is_deleted");

-- CreateIndex
CREATE INDEX "activities_activity_date_is_deleted_idx" ON "activities"("activity_date", "is_deleted");

-- CreateIndex
CREATE INDEX "activities_status_is_deleted_idx" ON "activities"("status", "is_deleted");

-- CreateIndex
CREATE INDEX "events_entity_id_idx" ON "events"("entity_id");

-- CreateIndex
CREATE INDEX "events_entity_type_idx" ON "events"("entity_type");

-- CreateIndex
CREATE INDEX "events_event_type_idx" ON "events"("event_type");

-- CreateIndex
CREATE INDEX "events_timestamp_idx" ON "events"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "focus_sessions_activity_id_key" ON "focus_sessions"("activity_id");

-- CreateIndex
CREATE INDEX "focus_sessions_goal_id_idx" ON "focus_sessions"("goal_id");

-- CreateIndex
CREATE INDEX "focus_sessions_status_idx" ON "focus_sessions"("status");

-- CreateIndex
CREATE INDEX "focus_sessions_is_deleted_idx" ON "focus_sessions"("is_deleted");

-- CreateIndex
CREATE INDEX "focus_sessions_started_at_idx" ON "focus_sessions"("started_at");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
