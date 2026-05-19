-- Migration 007: Drop legacy sales.edition_number
-- Date: 2026-05-19
-- Purpose: edition_number was an ad-hoc column never wired into the sales POST
-- handler. Replaced by sales.edition_id (FK to print_editions) in migration
-- 006. Verified zero prod rows ever had a non-null edition_number.

ALTER TABLE sales DROP COLUMN IF EXISTS edition_number;
