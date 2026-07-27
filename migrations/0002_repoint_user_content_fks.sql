-- ============================================================================
-- Phase 4 — Re-point user-data foreign keys at the catalog
--
-- This is the step that fixes the Add-to-Favorites crash: favorites and
-- watch_history stop referencing the legacy `content` table (Live TV's
-- table, which catalog UUIDs are absent from) and start referencing
-- content_items with a real, type-correct FK.
--
-- THIS FILE ALTERS EXISTING TABLES AND DELETES DATA (approved decisions
-- D2/D3): it truncates favorites (0 rows) and watch_history (27 disposable
-- test rows with dead string IDs), changes content_id to uuid on both, and
-- swaps the FKs. The legacy `content` table itself is NOT touched.
--
-- Pre-flight (required, run FIRST — see the Phase 4 handoff):
--   pg_dump snapshot of favorites + watch_history.
--
-- How to apply (after approval), Replit Shell:
--   psql "$DATABASE_URL" -f migrations/0002_repoint_user_content_fks.sql
--
-- Single transaction: fully applies or not at all.
--
-- Rollback (restores the pre-Phase-4 wiring; data comes from the snapshot):
--   BEGIN;
--   ALTER TABLE favorites     DROP CONSTRAINT favorites_content_id_content_items_id_fk;
--   ALTER TABLE watch_history DROP CONSTRAINT watch_history_content_id_content_items_id_fk;
--   ALTER TABLE favorites     ALTER COLUMN content_id TYPE varchar USING content_id::varchar;
--   ALTER TABLE watch_history ALTER COLUMN content_id TYPE varchar USING content_id::varchar;
--   ALTER TABLE favorites     ADD CONSTRAINT favorites_content_id_content_id_fk
--     FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE;
--   ALTER TABLE watch_history ADD CONSTRAINT watch_history_content_id_content_id_fk
--     FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE;
--   COMMIT;
-- ============================================================================

BEGIN;

-- D2: start clean. favorites is empty; watch_history holds 27 approved-
-- disposable test rows referencing legacy string IDs (tvmedia-*, tvmaze-*).
TRUNCATE favorites, watch_history;

-- Drop the old FKs to the legacy content table (names verified in Phase 0).
ALTER TABLE favorites     DROP CONSTRAINT favorites_content_id_content_id_fk;
ALTER TABLE watch_history DROP CONSTRAINT watch_history_content_id_content_id_fk;

-- D3: content_id becomes uuid, matching content_items.id. Tables are empty,
-- so the USING cast rewrites nothing.
ALTER TABLE favorites     ALTER COLUMN content_id TYPE uuid USING content_id::uuid;
ALTER TABLE watch_history ALTER COLUMN content_id TYPE uuid USING content_id::uuid;

-- The restored referential integrity: user data -> catalog.
-- Names follow Drizzle's convention so the schema file and database agree.
ALTER TABLE favorites
  ADD CONSTRAINT favorites_content_id_content_items_id_fk
  FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE CASCADE;

ALTER TABLE watch_history
  ADD CONSTRAINT watch_history_content_id_content_items_id_fk
  FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE CASCADE;

COMMIT;
