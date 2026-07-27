-- ============================================================================
-- Phase 1 — Create catalog tables in Neon (Supabase -> Neon consolidation)
--
-- STRICTLY ADDITIVE. Creates one enum and three new tables. Touches no
-- existing table, no existing constraint, no existing data.
--
-- Faithful reproduction of the Supabase schema as introspected on 2026-07-27
-- (see the Phase 0 audit in the planning thread): same column types, same
-- defaults, same constraint names, same indexes. Constraint names are kept
-- identical so nothing depending on them behaves differently.
--
-- Hand-written instead of drizzle-kit generated, deliberately: drizzle-kit
-- diffs the whole schema and could propose changes to existing tables;
-- this file cannot.
--
-- How to apply (after approval): paste the entire file into the Neon SQL
-- editor (console.neon.tech -> project -> SQL Editor) and run it once.
-- The whole file is one transaction: it either fully applies or not at all.
--
-- Rollback: the tables are empty at this stage, so rollback is simply
--   DROP TABLE content_platform_availability;
--   DROP TABLE content_items;
--   DROP TABLE platforms;
--   DROP TYPE content_type;
-- ============================================================================

BEGIN;

-- Full enum as designed in Supabase. Only 'movie' and 'series' are used
-- today; the rest anticipate future live TV / sports / podcast unification.
-- (Label order is not observable via information_schema from PostgREST and
-- no query orders by this enum, so ordering is cosmetic.)
CREATE TYPE content_type AS ENUM (
  'movie',
  'series',
  'episode',
  'live_channel',
  'sports_event',
  'podcast',
  'other'
);

CREATE TABLE content_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type     content_type NOT NULL,
  title            text NOT NULL,
  original_title   text,
  description      text,
  release_year     integer,
  runtime_minutes  integer,
  poster_url       text,
  backdrop_url     text,
  tmdb_id          bigint,
  imdb_id          text,
  season_number    integer,
  episode_number   integer,
  parent_series_id uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_items_tmdb_unique
    UNIQUE (tmdb_id, content_type),
  CONSTRAINT content_items_parent_series_id_fkey
    FOREIGN KEY (parent_series_id) REFERENCES content_items(id) ON DELETE SET NULL
);

CREATE INDEX idx_content_items_title            ON content_items (title);
CREATE INDEX idx_content_items_release_year     ON content_items (release_year);
CREATE INDEX idx_content_items_parent_series_id ON content_items (parent_series_id);

CREATE TABLE platforms (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text NOT NULL,
  name           text NOT NULL,
  logo_url       text,
  app_store_url  text,
  website_url    text,
  deep_link_base text,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platforms_slug_key UNIQUE (slug),
  CONSTRAINT platforms_name_key UNIQUE (name)
);

CREATE TABLE content_platform_availability (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id   uuid NOT NULL,
  platform_id       uuid NOT NULL,
  is_available      boolean NOT NULL DEFAULT true,
  availability_type text,
  deep_link_url     text NOT NULL,
  web_link_url      text,
  region_code       text DEFAULT 'US'::text,
  quality_label     text,
  price_numeric     numeric,
  currency_code     text,
  last_verified_at  timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_platform_unique
    UNIQUE (content_item_id, platform_id, region_code, availability_type),
  CONSTRAINT content_platform_availability_content_item_id_fkey
    FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE CASCADE,
  CONSTRAINT content_platform_availability_platform_id_fkey
    FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE
);

CREATE INDEX idx_cpa_content_item_id ON content_platform_availability (content_item_id);
CREATE INDEX idx_cpa_platform_id     ON content_platform_availability (platform_id);
CREATE INDEX idx_cpa_region_code     ON content_platform_availability (region_code);

COMMIT;
