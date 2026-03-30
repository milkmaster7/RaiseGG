-- Add city column to players table for geo-based SEO pages
ALTER TABLE players ADD COLUMN IF NOT EXISTS city TEXT;

-- Index for city-based queries
CREATE INDEX IF NOT EXISTS idx_players_city ON players (city) WHERE city IS NOT NULL;
