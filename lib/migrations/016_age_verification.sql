-- Age verification columns
ALTER TABLE players ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMPTZ;
