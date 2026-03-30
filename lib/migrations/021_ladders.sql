-- Weekly ladder entries: tracks player performance per week per game
CREATE TABLE IF NOT EXISTS weekly_ladder_entries (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game          TEXT NOT NULL CHECK (game IN ('cs2', 'dota2', 'deadlock')),
  week_start    DATE NOT NULL,  -- Monday UTC of the ladder week
  points        INT NOT NULL DEFAULT 0,
  wins          INT NOT NULL DEFAULT 0,
  losses        INT NOT NULL DEFAULT 0,
  best_streak   INT NOT NULL DEFAULT 0,
  rank          INT,  -- computed at read time or via cron
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (player_id, game, week_start)
);

-- Fast lookups for current week standings
CREATE INDEX idx_ladder_week_game ON weekly_ladder_entries (week_start, game, points DESC);
CREATE INDEX idx_ladder_player ON weekly_ladder_entries (player_id, game, week_start DESC);

-- Previous week snapshot for trend calculation
CREATE TABLE IF NOT EXISTS weekly_ladder_archive (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game          TEXT NOT NULL CHECK (game IN ('cs2', 'dota2', 'deadlock')),
  week_start    DATE NOT NULL,
  final_rank    INT NOT NULL,
  points        INT NOT NULL DEFAULT 0,
  wins          INT NOT NULL DEFAULT 0,
  losses        INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (player_id, game, week_start)
);

CREATE INDEX idx_ladder_archive_week ON weekly_ladder_archive (week_start, game);
