-- Team match support + time limit columns
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_type TEXT DEFAULT '1v1' CHECK (match_type IN ('1v1', '2v2', '5v5'));
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_a_name TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_b_name TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_a_players UUID[] DEFAULT '{}';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_b_players UUID[] DEFAULT '{}';

-- Ensure expires_at and resolve_deadline exist (may already be present)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS resolve_deadline TIMESTAMPTZ;
