-- Game server pool management
CREATE TABLE IF NOT EXISTS game_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL,
  port INTEGER NOT NULL,
  rcon_password TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT 'eu-west',
  status TEXT NOT NULL DEFAULT 'available',
  current_match_id UUID REFERENCES matches(id),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider TEXT NOT NULL DEFAULT 'custom',
  hostname TEXT NOT NULL,
  gotv_port INTEGER,
  player_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_servers_available ON game_servers(status, region) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_game_servers_match ON game_servers(current_match_id) WHERE current_match_id IS NOT NULL;
