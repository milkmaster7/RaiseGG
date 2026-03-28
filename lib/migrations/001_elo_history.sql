CREATE TABLE IF NOT EXISTS elo_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game        TEXT NOT NULL CHECK (game IN ('cs2', 'dota2', 'deadlock')),
  elo         INTEGER NOT NULL,
  delta       INTEGER NOT NULL,
  match_id    UUID REFERENCES matches(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_elo_history_player_game ON elo_history(player_id, game, recorded_at DESC);
