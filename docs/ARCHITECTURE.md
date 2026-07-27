# Architecture

Frontend:
- React + Vite

Backend:
- Express

Data:
- Neon Postgres via Drizzle ORM (`DATABASE_URL`) — single database for user
  data (users, sessions, favorites, watch_history, preferences, connections),
  the catalog (content_items, platforms, content_platform_availability), and
  the legacy `content` table (Live TV sync only)
- Supabase: retired 2026-07-27 (consolidation). Project frozen as fallback;
  deletion pending post-verification sign-off.

Constraints:
- Do not add Vite proxy
- Avoid major refactors
- Prefer adapting existing components
