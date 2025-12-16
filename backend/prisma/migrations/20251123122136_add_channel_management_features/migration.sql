-- CreateTable
CREATE TABLE "channel_targets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "quarter" TEXT,
    "month" INTEGER,
    "target_type" TEXT NOT NULL,
    "new_sign_target" REAL NOT NULL DEFAULT 0,
    "core_opportunity" REAL NOT NULL DEFAULT 0,
    "core_revenue" REAL NOT NULL DEFAULT 0,
    "high_value_opp" REAL NOT NULL DEFAULT 0,
    "high_value_revenue" REAL NOT NULL DEFAULT 0,
    "new_sign_completed" REAL NOT NULL DEFAULT 0,
    "core_opp_completed" REAL NOT NULL DEFAULT 0,
    "core_rev_completed" REAL NOT NULL DEFAULT 0,
    "high_value_opp_comp" REAL NOT NULL DEFAULT 0,
    "high_value_rev_comp" REAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "channel_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "work_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributor_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "opportunity_source" TEXT,
    "project_mgmt" TEXT,
    "channel_actions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "work_plans_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "distributors" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "work_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "weekly_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "work_plan_id" TEXT NOT NULL,
    "week_number" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "progress" TEXT,
    "obstacles" TEXT,
    "adjustments" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "weekly_reviews_work_plan_id_fkey" FOREIGN KEY ("work_plan_id") REFERENCES "work_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    CONSTRAINT "distributors_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_distributors" ("contact_person", "cooperation_level", "created_at", "credit_limit", "deleted_at", "historical_performance", "id", "name", "notes", "owner_user_id", "phone", "region", "tags", "updated_at") SELECT "contact_person", "cooperation_level", "created_at", "credit_limit", "deleted_at", "historical_performance", "id", "name", "notes", "owner_user_id", "phone", "region", "tags", "updated_at" FROM "distributors";
DROP TABLE "distributors";
ALTER TABLE "new_distributors" RENAME TO "distributors";
CREATE INDEX "distributors_owner_user_id_idx" ON "distributors"("owner_user_id");
CREATE INDEX "distributors_deleted_at_idx" ON "distributors"("deleted_at");
CREATE INDEX "distributors_channel_type_idx" ON "distributors"("channel_type");
CREATE UNIQUE INDEX "distributors_name_region_key" ON "distributors"("name", "region");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "channel_targets_year_quarter_month_idx" ON "channel_targets"("year", "quarter", "month");

-- CreateIndex
CREATE INDEX "channel_targets_user_id_idx" ON "channel_targets"("user_id");

-- CreateIndex
CREATE INDEX "channel_targets_target_type_idx" ON "channel_targets"("target_type");

-- CreateIndex
CREATE INDEX "work_plans_distributor_id_idx" ON "work_plans"("distributor_id");

-- CreateIndex
CREATE INDEX "work_plans_user_id_idx" ON "work_plans"("user_id");

-- CreateIndex
CREATE INDEX "work_plans_year_month_idx" ON "work_plans"("year", "month");

-- CreateIndex
CREATE INDEX "weekly_reviews_work_plan_id_idx" ON "weekly_reviews"("work_plan_id");

-- CreateIndex
CREATE INDEX "weekly_reviews_year_week_number_idx" ON "weekly_reviews"("year", "week_number");
