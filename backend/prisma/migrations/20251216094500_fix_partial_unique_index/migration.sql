-- Drop the flawed index that doesn't work with NULL values
DROP INDEX IF EXISTS "distributors_name_region_deleted_at_key";

-- Create a partial unique index that ONLY applies to non-deleted records
-- This enforces uniqueness for active distributors (deleted_at IS NULL)
-- Soft-deleted records are excluded from the constraint
CREATE UNIQUE INDEX "distributors_name_region_active_key"
  ON "distributors"("name", "region")
  WHERE "deleted_at" IS NULL;

-- Keep a non-unique index for soft-deleted records for query performance
CREATE INDEX "distributors_name_region_deleted_key"
  ON "distributors"("name", "region", "deleted_at")
  WHERE "deleted_at" IS NOT NULL;
