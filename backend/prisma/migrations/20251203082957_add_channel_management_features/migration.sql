-- CreateTable
CREATE TABLE "partner_visits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributor_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "visit_date" DATETIME NOT NULL,
    "visitType" TEXT NOT NULL DEFAULT 'onsite',
    "purpose" TEXT NOT NULL,
    "participants" TEXT,
    "key_discussions" TEXT,
    "feedback" TEXT,
    "next_steps" TEXT,
    "satisfaction_score" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "partner_visits_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "distributors" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "partner_visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "partner_health_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributor_id" TEXT NOT NULL,
    "overall_score" REAL NOT NULL DEFAULT 0,
    "performance_score" REAL NOT NULL DEFAULT 0,
    "revenue_growth" REAL NOT NULL DEFAULT 0,
    "target_achievement" REAL NOT NULL DEFAULT 0,
    "order_frequency" REAL NOT NULL DEFAULT 0,
    "engagement_score" REAL NOT NULL DEFAULT 0,
    "product_lines_count" INTEGER NOT NULL DEFAULT 0,
    "training_participation" REAL NOT NULL DEFAULT 0,
    "activity_score" REAL NOT NULL DEFAULT 0,
    "last_order_days" INTEGER NOT NULL DEFAULT 999,
    "last_contact_days" INTEGER NOT NULL DEFAULT 999,
    "response_rate" REAL NOT NULL DEFAULT 0,
    "satisfaction_score_dim" REAL NOT NULL DEFAULT 0,
    "avg_satisfaction_rating" REAL NOT NULL DEFAULT 0,
    "complaint_count" INTEGER NOT NULL DEFAULT 0,
    "health_status" TEXT NOT NULL DEFAULT 'healthy',
    "alerts" TEXT,
    "recommendations" TEXT,
    "calculated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "partner_health_scores_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "distributors" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_distributors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "cooperation_level" TEXT NOT NULL DEFAULT 'bronze',
    "credit_limit" REAL NOT NULL DEFAULT 0,
    "tags" TEXT,
    "historical_performance" TEXT,
    "notes" TEXT,
    "owner_user_id" TEXT NOT NULL,
    "deleted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "channel_type" TEXT NOT NULL DEFAULT 'normal',
    "quarterly_target" REAL NOT NULL DEFAULT 0,
    "quarterly_completed" REAL NOT NULL DEFAULT 0,
    "project_count" INTEGER NOT NULL DEFAULT 0,
    "project_amount" REAL NOT NULL DEFAULT 0,
    "partner_type" TEXT NOT NULL DEFAULT 'reseller',
    "channel_tier" TEXT NOT NULL DEFAULT 'standard',
    "certifications" TEXT,
    "certification_level" TEXT NOT NULL DEFAULT 'bronze',
    "service_area" TEXT,
    "product_lines" TEXT,
    "industry_focus" TEXT,
    "health_score" REAL NOT NULL DEFAULT 0,
    "health_status" TEXT NOT NULL DEFAULT 'healthy',
    "last_contact_date" DATETIME,
    CONSTRAINT "distributors_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_distributors" ("channel_type", "contact_person", "cooperation_level", "created_at", "credit_limit", "deleted_at", "historical_performance", "id", "name", "notes", "owner_user_id", "phone", "project_amount", "project_count", "quarterly_completed", "quarterly_target", "region", "tags", "updated_at") SELECT "channel_type", "contact_person", "cooperation_level", "created_at", "credit_limit", "deleted_at", "historical_performance", "id", "name", "notes", "owner_user_id", "phone", "project_amount", "project_count", "quarterly_completed", "quarterly_target", "region", "tags", "updated_at" FROM "distributors";
DROP TABLE "distributors";
ALTER TABLE "new_distributors" RENAME TO "distributors";
CREATE INDEX "distributors_owner_user_id_idx" ON "distributors"("owner_user_id");
CREATE INDEX "distributors_deleted_at_idx" ON "distributors"("deleted_at");
CREATE INDEX "distributors_channel_type_idx" ON "distributors"("channel_type");
CREATE UNIQUE INDEX "distributors_name_region_key" ON "distributors"("name", "region");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "partner_visits_distributor_id_idx" ON "partner_visits"("distributor_id");

-- CreateIndex
CREATE INDEX "partner_visits_user_id_idx" ON "partner_visits"("user_id");

-- CreateIndex
CREATE INDEX "partner_visits_visit_date_idx" ON "partner_visits"("visit_date");

-- CreateIndex
CREATE INDEX "partner_health_scores_distributor_id_idx" ON "partner_health_scores"("distributor_id");

-- CreateIndex
CREATE INDEX "partner_health_scores_overall_score_idx" ON "partner_health_scores"("overall_score");

-- CreateIndex
CREATE INDEX "partner_health_scores_health_status_idx" ON "partner_health_scores"("health_status");

-- CreateIndex
CREATE INDEX "partner_health_scores_calculated_at_idx" ON "partner_health_scores"("calculated_at");
