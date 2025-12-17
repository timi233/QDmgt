-- DropIndex
DROP INDEX IF EXISTS "distributors_name_region_key";

-- CreateIndex
CREATE UNIQUE INDEX "distributors_name_region_deleted_at_key" ON "distributors"("name", "region", "deleted_at");
