-- CreateIndex
CREATE INDEX "activities_goal_id_is_deleted_idx" ON "activities"("goal_id", "is_deleted");

-- CreateIndex
CREATE INDEX "activities_activity_date_is_deleted_idx" ON "activities"("activity_date", "is_deleted");

-- CreateIndex
CREATE INDEX "activities_status_is_deleted_idx" ON "activities"("status", "is_deleted");

-- CreateIndex
CREATE INDEX "goals_is_deleted_status_idx" ON "goals"("is_deleted", "status");
