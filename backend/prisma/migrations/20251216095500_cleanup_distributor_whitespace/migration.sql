-- Cleanup existing distributor data: trim whitespace from name and region
-- This migration should ideally run BEFORE the partial unique index migration
-- but for this dev database it was executed after (both migrations have succeeded)
--
-- For PRODUCTION deployment:
-- If deploying to a fresh database, consider merging this into the partial index migration
-- or renumbering the migration timestamp to run before 20251216094500

UPDATE "distributors"
SET
  "name" = TRIM("name"),
  "region" = TRIM("region"),
  "contact_person" = TRIM("contact_person"),
  "notes" = CASE WHEN "notes" IS NOT NULL THEN TRIM("notes") ELSE NULL END,
  "historical_performance" = CASE WHEN "historical_performance" IS NOT NULL THEN TRIM("historical_performance") ELSE NULL END;
