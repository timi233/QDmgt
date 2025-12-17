-- Make task.distributor_id optional (nullable)
-- This allows tasks to be created without linking to a distributor

-- SQLite doesn't support ALTER COLUMN directly, need to recreate the table
-- However, since we're just making a column nullable (removing NOT NULL),
-- we can use a workaround with a new table

-- Step 1: Create new tasks table with nullable distributor_id
CREATE TABLE "tasks_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributor_id" TEXT,
    "assigned_user_id" TEXT NOT NULL,
    "creator_user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deadline" DATETIME NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "archived_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "completed_at" DATETIME,
    CONSTRAINT "tasks_distributor_id_fkey" FOREIGN KEY ("distributor_id") REFERENCES "distributors" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Step 2: Copy data from old table
INSERT INTO "tasks_new" SELECT * FROM "tasks";

-- Step 3: Drop old table
DROP TABLE "tasks";

-- Step 4: Rename new table
ALTER TABLE "tasks_new" RENAME TO "tasks";

-- Step 5: Recreate indexes
CREATE INDEX "tasks_assigned_user_id_idx" ON "tasks"("assigned_user_id");
CREATE INDEX "tasks_creator_user_id_idx" ON "tasks"("creator_user_id");
CREATE INDEX "tasks_deadline_idx" ON "tasks"("deadline");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_archived_at_idx" ON "tasks"("archived_at");
