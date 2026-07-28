-- PHASE 0 — Supabase schema introspection (READ ONLY).
-- PostgREST (the Supabase JS client) cannot query information_schema, so this
-- runs in the Supabase dashboard SQL editor instead:
--   Dashboard -> SQL Editor -> New query -> paste ALL of this -> Run.
-- It returns four result sets. Copy each one back into the planning thread.
-- These lock down the exact column types, defaults, constraints, and indexes
-- that the new Neon tables must reproduce.

-- 1. Column definitions
SELECT table_name, ordinal_position, column_name, data_type,
       is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name IN ('content_items', 'platforms', 'content_platform_availability')
 ORDER BY table_name, ordinal_position;

-- 2. Constraints (p = primary key, f = foreign key, u = unique, c = check)
SELECT rel.relname  AS table_name,
       con.conname  AS constraint_name,
       con.contype  AS type,
       pg_get_constraintdef(con.oid) AS definition
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
 WHERE rel.relnamespace = 'public'::regnamespace
   AND rel.relname IN ('content_items', 'platforms', 'content_platform_availability')
 ORDER BY rel.relname, con.contype, con.conname;

-- 3. Indexes
SELECT tablename AS table_name, indexname, indexdef
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND tablename IN ('content_items', 'platforms', 'content_platform_availability')
 ORDER BY tablename, indexname;

-- 4. Row counts (cross-check against the audit script's Section B)
SELECT 'content_items' AS table_name, count(*) AS rows FROM content_items
UNION ALL
SELECT 'platforms', count(*) FROM platforms
UNION ALL
SELECT 'content_platform_availability', count(*) FROM content_platform_availability;
