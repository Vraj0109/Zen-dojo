-- Migration 0006 (plan 0069, public profile): opt-in public portfolio snapshot.
-- One row per user who turned "Make my profile public" on. Turning it off deletes the row.
-- public_id is a random opaque id, NOT the account id (the account id embeds the GitHub numeric id).
-- data holds the validated PortfolioData JSON only. Safe to apply more than once.
-- Apply after 0005 (table sync).

CREATE TABLE IF NOT EXISTS public_profiles (
  user_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
