-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT,
    "email" TEXT,
    "password_hash" TEXT,
    "name" TEXT,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "require_password_change" BOOLEAN NOT NULL DEFAULT false,
    "feishu_id" TEXT,
    "feishu_union_id" TEXT,
    "phone" TEXT,
    "avatar" TEXT,
    "department" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_users" ("created_at", "email", "id", "name", "password_hash", "require_password_change", "role", "status", "updated_at", "username") SELECT "created_at", "email", "id", "name", "password_hash", "require_password_change", "role", "status", "updated_at", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_feishu_id_key" ON "users"("feishu_id");
CREATE UNIQUE INDEX "users_feishu_union_id_key" ON "users"("feishu_union_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
